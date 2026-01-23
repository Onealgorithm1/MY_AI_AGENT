
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { query } from '../utils/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'data_model.html');

async function generateDataModel() {
    console.log('🚀 Starting Data Model Documentation Generation...');
    console.log(`📂 Output file: ${OUTPUT_FILE}`);

    try {
        // 1. Fetch all tables
        const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`📊 Found ${tables.length} tables.`);

        // 2. Fetch all foreign keys for Mermaid ER Diagram
        const fkRes = await query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
    `);
        const foreignKeys = fkRes.rows;

        // 3. Prepare data structures
        const tableData = [];

        // 4. Iterate tables to get columns and sample data
        for (const tableName of tables) {
            // Get Columns
            const columnsRes = await query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

            // Get Primary Keys
            const pkRes = await query(`
        SELECT c.column_name
        FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name) 
        JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
          AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
        WHERE constraint_type = 'PRIMARY KEY' and tc.table_name = $1;
      `, [tableName]);
            const pks = pkRes.rows.map(r => r.column_name);

            // Get Sample Data
            let sampleRows = [];
            try {
                const sampleRes = await query(`SELECT * FROM "${tableName}" LIMIT 5`);
                sampleRows = sampleRes.rows;
            } catch (err) {
                console.warn(`⚠️ Could not fetch sample data for ${tableName}: ${err.message}`);
            }

            tableData.push({
                name: tableName,
                columns: columnsRes.rows.map(col => ({
                    ...col,
                    isPk: pks.includes(col.column_name),
                    isFk: foreignKeys.find(fk => fk.table_name === tableName && fk.column_name === col.column_name)
                })),
                sampleData: sampleRows
            });
            process.stdout.write('.');
        }
        console.log('\n✅ Metadata fetched.');

        // 5. Generate HTML Content
        const htmlContent = buildHtml(tableData, foreignKeys);

        // 6. Write File
        fs.writeFileSync(OUTPUT_FILE, htmlContent);
        console.log(`\n🎉 Verified! Documentation updated at ${OUTPUT_FILE}`);
        console.log(`Total Tables: ${tables.length}`);

    } catch (error) {
        console.error('❌ Error generating data model:', error);
    } finally {
        await pool.end();
    }
}

function buildHtml(tables, fks) {
    const generatedDate = new Date().toLocaleString();

    // MERMAID DIAGRAM
    let mermaidGraph = 'erDiagram\n';
    fks.forEach(fk => {
        // relation syntax: entity1 }|..|{ entity2 : label
        // Simplified for robustness: Table1 }|..|{ Table2 : "fk_col"
        mermaidGraph += `                    ${fk.table_name} }|..|{ ${fk.foreign_table_name} : "${fk.column_name}"\n`;
    });

    // TABLE CARDS
    let tableCards = '';
    tables.forEach(t => {
        // Schema Rows
        const schemaRows = t.columns.map(c => {
            let constraints = [];
            if (c.isPk) constraints.push('<span class="pk">PK</span>');
            if (c.isFk) constraints.push(`<span class="fk">FK(${c.isFk.foreign_table_name})</span>`);

            return `      <tr>
          <td><b>${c.column_name}</b></td>
          <td><code>${c.data_type}</code></td>
          <td>${c.is_nullable}</td>
          <td>${c.column_default || '-'}</td>
          <td>${constraints.join(' ')}</td>
        </tr>`;
        }).join('');

        // Sample Data Rows
        let sampleTable = '<p style="color: #64748b; font-style: italic;">No data available in this table.</p>';
        if (t.sampleData && t.sampleData.length > 0) {
            const headers = t.columns.map(c => `<th>${c.column_name}</th>`).join('');
            const rows = t.sampleData.map(row => {
                const cells = t.columns.map(c => {
                    let val = row[c.column_name];
                    if (val === null || val === undefined) return '<i style="color:#aaa">null</i>';
                    if (typeof val === 'object') return JSON.stringify(val).substring(0, 50) + (JSON.stringify(val).length > 50 ? '...' : '');
                    if (typeof val === 'string' && val.length > 100) return val.substring(0, 100) + '...';
                    return val;
                }).join('');
                return `<tr>${cells}</tr>`;
            }).join('');

            sampleTable = `<div class="section-title">📝 Sample Data (Top 5 Rows)</div><div style="overflow-x: auto;"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
        }

        tableCards += `
    <div class="card">
      <div class="card-header" onclick="toggleCard('body-${t.name}')">
        <span>${t.name}</span>
        <span class="toggle-icon">▼</span>
      </div>
      <div id="body-${t.name}" class="card-body">
        
        <div class="section-title">🔌 Schema Definition</div>
        <table>
          <thead><tr><th>Column</th><th>Type</th><th>Nullable</th><th>Default</th><th>Constraints</th></tr></thead>
          <tbody>
${schemaRows}</tbody></table>${sampleTable}</div></div>`;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My AI Agent - Master Data Model</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({startOnLoad:true});</script>
    <style>
        :root { --primary: #2563eb; --bg: #f8fafc; --border: #e2e8f0; }
        body { font-family: system-ui, sans-serif; background: var(--bg); color: #1e293b; line-height: 1.6; padding: 2rem; max-width: 1400px; margin: 0 auto; }
        h1 { border-bottom: 2px solid var(--border); padding-bottom: 1rem; }
        .card { background: white; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 2rem; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .card-header { background: #f1f5f9; padding: 1rem; font-weight: bold; color: var(--primary); display: flex; justify-content: space-between; cursor: pointer; }
        .card-body { padding: 1.5rem; display: none; }
        .card-body.open { display: block; }
        table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom: 1rem; }
        th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid var(--border); }
        th { background: #f8fafc; font-weight: 600; white-space: nowrap; }
        code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; color: #d63384; font-family: monospace; }
        .pk { color: #16a34a; font-weight: bold; }
        .fk { color: #9333ea; font-weight: bold; }
        .section-title { margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: bold; color: #475569; border-bottom: 1px solid #eee; }
        .toggle-icon { transition: transform 0.2s; }
        .open .toggle-icon { transform: rotate(180deg); }

        /* Zoom Container Styles */
        #erd-container {
            width: 100%;
            height: 600px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            background: #fafafa;
            position: relative;
            cursor: grab;
        }
        #erd-container:active { cursor: grabbing; }
        #erd-content {
            transform-origin: 0 0;
            transition: transform 0.1s ease-out;
            min-height: 100%;
            min-width: 100%;
        }
        .zoom-controls {
            position: absolute;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 5px;
            z-index: 10;
            background: white;
            padding: 5px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .zoom-btn {
            width: 30px;
            height: 30px;
            border: 1px solid #ccc;
            background: white;
            cursor: pointer;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .zoom-btn:hover { background: #f0f0f0; }
    </style>
    <script>
      function toggleCard(id) {
        document.getElementById(id).classList.toggle('open');
      }
      function expandAll() {
        document.querySelectorAll('.card-body').forEach(el => el.classList.add('open'));
      }
      function collapseAll() {
        document.querySelectorAll('.card-body').forEach(el => el.classList.remove('open'));
      }

      // Zoom Logic
      let currentZoom = 1;
      let translateX = 0;
      let translateY = 0;
      let isDragging = false;
      let startX, startY;

      function updateZoom() {
          const el = document.getElementById('erd-content');
          if(el) el.style.transform = \`translate(\${translateX}px, \${translateY}px) scale(\${currentZoom})\`;
      }

      function zoomIn() { currentZoom *= 1.2; updateZoom(); }
      function zoomOut() { currentZoom /= 1.2; updateZoom(); }
      function resetZoom() { currentZoom = 1; translateX = 0; translateY = 0; updateZoom(); }

      window.onload = function() {
          const container = document.getElementById('erd-container');
          if(!container) return; // Guard clause

          container.addEventListener('wheel', (e) => {
              if (e.ctrlKey || e.metaKey) { // Only zoom with ctrl key like maps, or standard? Standard is cleaner for dedicated div.
                   // Actually for a dedicated area, direct wheel is better.
              }
              e.preventDefault();
              const delta = e.deltaY > 0 ? 0.9 : 1.1;
              currentZoom *= delta;
              updateZoom();
          });

          container.addEventListener('mousedown', (e) => {
              isDragging = true;
              startX = e.clientX - translateX;
              startY = e.clientY - translateY;
          });

          window.addEventListener('mouseup', () => { isDragging = false; });

          window.addEventListener('mousemove', (e) => {
              if (!isDragging) return;
              translateX = e.clientX - startX;
              translateY = e.clientY - startY;
              updateZoom();
          });
      };
    </script>
</head>
<body>
    <h1>📦 Database Schema & Sample Data</h1>
    <p>Generated: ${generatedDate} | Tables: ${tables.length}</p>
    
    <div style="margin-bottom: 2rem;">
        <button onclick="expandAll()" style="padding: 8px 16px; margin-right: 10px; cursor: pointer;">Expand All</button>
        <button onclick="collapseAll()" style="padding: 8px 16px; cursor: pointer;">Collapse All</button>
    </div>

    <!-- MERMAID DIAGRAM with ZOOM -->
    <div class="card">
      <div class="card-header" onclick="toggleCard('erd-body')">
        <span>🔗 Entity Relationship Diagram (Interactive)</span>
        <span class="toggle-icon">▼</span>
      </div>
      <div id="erd-body" class="card-body open" style="padding:0;">
          <div id="erd-container">
               <div class="zoom-controls">
                   <button class="zoom-btn" onclick="zoomIn()" title="Zoom In">+</button>
                   <button class="zoom-btn" onclick="resetZoom()" title="Reset">⟲</button>
                   <button class="zoom-btn" onclick="zoomOut()" title="Zoom Out">-</button>
               </div>
               <div id="erd-content">
                  <div class="mermaid">
${mermaidGraph}                  </div>
               </div>
          </div>
          <div style="padding: 10px; font-size: 0.8em; color: gray; text-align:center;">
             Use Mouse Wheel to Zoom • Drag to Pan
          </div>
      </div>
    </div>

    <!-- TABLES -->
${tableCards}
</body>
</html>`;
}

generateDataModel();
