# Deployment Diagnostic Scripts

Two scripts to help diagnose deployment issues without overwhelming terminal output.

## Option 1: Filtered Output (Quick Check)
**Use when:** You want to see key info immediately in your terminal

```bash
bash diagnostic-commands.sh
```

This shows:
- Count of VITE_ENABLE_ENHANCED_STT occurrences
- Latest 3 ChatPage files
- First 3 matches of werkules URLs
- Service worker presence
- Key parts of index.html

## Option 2: Full Output to File (Detailed Analysis)
**Use when:** You need complete output for analysis or to share

```bash
bash diagnostic-full-output.sh
```

This creates a timestamped file like `deployment-diagnostic-20250113-143022.txt` with:
- Complete grep results
- All file listings
- Full index.html content
- Can be easily shared or analyzed

### After running full output:
```bash
# View the file
cat deployment-diagnostic-*.txt

# Search for specific issues
grep "ENHANCED_STT" deployment-diagnostic-*.txt
grep "error" deployment-diagnostic-*.txt -i

# Share with others
# The file is self-contained and can be copied/emailed
```

## What These Scripts Check

1. **VITE_ENABLE_ENHANCED_STT**: Whether the environment variable made it into the build
2. **Build deployment**: If new ChatPage files are present (by timestamp)
3. **API URLs**: What endpoints are baked into the JavaScript
4. **WebSocket URLs**: What WSS connections are configured
5. **Service worker**: If caching might be interfering
6. **Asset loading**: What scripts index.html actually loads

## Making Scripts Executable

```bash
chmod +x diagnostic-commands.sh diagnostic-full-output.sh
```
