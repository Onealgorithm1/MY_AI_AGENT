import { query } from '../utils/database.js';

export class PlankaService {
  async ensureUserExists(appUserId, userEmail, userName) {
    const username = `${userEmail.split('@')[0]}_${appUserId.substring(0, 8)}`;
    
    const result = await query(
      `INSERT INTO user_account (
         email, name, username, role, 
         subscribe_to_own_cards, subscribe_to_card_when_commenting,
         turn_off_recent_card_highlighting, enable_favorites_by_default,
         default_editor_mode, default_home_view, default_projects_order,
         is_sso_user, is_deactivated,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, 'user', true, true, false, false, 'regular', 'projects', 'position', false, false, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE 
       SET name = EXCLUDED.name, updated_at = NOW()
       RETURNING id`,
      [userEmail, userName, username]
    );
    return result.rows[0].id;
  }

  async ensureUserProject(plankaUserId, userEmail) {
    const projectName = `Tasks - ${userEmail}`;
    
    const projectCheck = await query(
      `SELECT p.id, p.name
       FROM project p
       JOIN project_manager pm ON p.id = pm.project_id
       WHERE pm.user_id = $1 AND p.name = $2
       LIMIT 1`,
      [plankaUserId, projectName]
    );
    
    if (projectCheck.rows.length > 0) {
      const boardCheck = await query(
        `SELECT b.id FROM board b
         JOIN board_membership bm ON b.id = bm.board_id
         WHERE b.project_id = $1 AND bm.user_id = $2
         LIMIT 1`,
        [projectCheck.rows[0].id, plankaUserId]
      );
      
      if (boardCheck.rows.length > 0) {
        return {
          projectId: projectCheck.rows[0].id,
          boardId: boardCheck.rows[0].id
        };
      }
    }

    const projectResult = await query(
      `INSERT INTO project (name, is_hidden, created_at, updated_at)
       VALUES ($1, false, NOW(), NOW())
       RETURNING id`,
      [projectName]
    );
    
    const projectId = projectResult.rows[0].id;

    await query(
      `INSERT INTO project_manager (project_id, user_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [projectId, plankaUserId]
    );

    const boardResult = await query(
      `INSERT INTO board (
        project_id, position, name, 
        default_view, default_card_type, 
        limit_card_types_to_default_one, always_display_card_creator,
        expand_task_lists_by_default,
        created_at, updated_at
       )
       VALUES ($1, 65536, 'My Tasks', 'kanban', 'project', false, false, false, NOW(), NOW())
       RETURNING id`,
      [projectId]
    );

    const boardId = boardResult.rows[0].id;

    await query(
      `INSERT INTO board_membership (board_id, user_id, role, can_comment, created_at, updated_at)
       VALUES ($1, $2, 'editor', true, NOW(), NOW())`,
      [boardId, plankaUserId]
    );

    const listNames = ['To Do', 'In Progress', 'Done'];
    for (let i = 0; i < listNames.length; i++) {
      await query(
        `INSERT INTO list (board_id, position, name, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [boardId, (i + 1) * 65536, listNames[i]]
      );
    }

    return { projectId, boardId };
  }

  async createCard(plankaUserId, appUserId, userEmail, cardData) {
    const { boardId } = await this.ensureUserProject(plankaUserId, userEmail);
    
    const listResult = await query(
      `SELECT id FROM list WHERE board_id = $1 AND name = 'To Do' LIMIT 1`,
      [boardId]
    );
    const listId = listResult.rows[0].id;

    const maxPositionResult = await query(
      `SELECT COALESCE(MAX(position), 0) as max_pos FROM card WHERE list_id = $1`,
      [listId]
    );
    const position = maxPositionResult.rows[0].max_pos + 65536;

    const cardResult = await query(
      `INSERT INTO card (
        board_id, list_id, creator_user_id, type, position, name, description,
        due_date, is_due_completed, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, name, description, due_date, created_at`,
      [
        boardId,
        listId,
        plankaUserId,
        cardData.type || 'project',
        position,
        cardData.name,
        cardData.description || null,
        cardData.dueDate || null,
        cardData.isDueCompleted || false
      ]
    );

    return cardResult.rows[0];
  }

  async getCards(plankaUserId, userEmail) {
    const { boardId } = await this.ensureUserProject(plankaUserId, userEmail);

    const cardsResult = await query(
      `SELECT c.id, c.name, c.description, c.due_date, c.is_due_completed,
              l.name as list_name, c.created_at, c.updated_at
       FROM card c
       JOIN list l ON c.list_id = l.id
       WHERE c.board_id = $1 AND c.creator_user_id = $2
       ORDER BY l.position, c.position`,
      [boardId, plankaUserId]
    );

    return cardsResult.rows;
  }
  
  async verifyCardOwnership(cardId, plankaUserId) {
    const result = await query(
      `SELECT c.id FROM card c
       WHERE c.id = $1 AND c.creator_user_id = $2`,
      [cardId, plankaUserId]
    );
    return result.rows.length > 0;
  }

  async updateCard(cardId, plankaUserId, updates) {
    const isOwner = await this.verifyCardOwnership(cardId, plankaUserId);
    if (!isOwner) {
      throw new Error('Unauthorized: You can only update your own tasks');
    }

    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.isDueCompleted !== undefined) {
      setClauses.push(`is_due_completed = $${paramCount++}`);
      values.push(updates.isDueCompleted);
    }
    if (updates.listName !== undefined) {
      const listResult = await query(
        `SELECT l.id FROM list l
         JOIN board b ON l.board_id = b.id
         JOIN card c ON c.board_id = b.id
         WHERE c.id = $1 AND l.name = $2 AND c.creator_user_id = $3`,
        [cardId, updates.listName, plankaUserId]
      );
      if (listResult.rows.length > 0) {
        setClauses.push(`list_id = $${paramCount++}`);
        values.push(listResult.rows[0].id);
      }
    }

    if (setClauses.length === 0) {
      return null;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(cardId);

    const result = await query(
      `UPDATE card SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async deleteCard(cardId, plankaUserId) {
    const isOwner = await this.verifyCardOwnership(cardId, plankaUserId);
    if (!isOwner) {
      throw new Error('Unauthorized: You can only delete your own tasks');
    }
    
    await query(`DELETE FROM card WHERE id = $1`, [cardId]);
    return true;
  }

  async createTask(plankaUserId, cardId, taskData) {
    const isOwner = await this.verifyCardOwnership(cardId, plankaUserId);
    if (!isOwner) {
      throw new Error('Unauthorized: You can only create tasks on your own cards');
    }

    const taskListResult = await query(
      `SELECT tl.id FROM task_list tl
       WHERE tl.card_id = $1
       LIMIT 1`,
      [cardId]
    );

    let taskListId;
    if (taskListResult.rows.length === 0) {
      const newTaskListResult = await query(
        `INSERT INTO task_list (card_id, position, name, created_at, updated_at)
         VALUES ($1, 65536, 'Tasks', NOW(), NOW())
         RETURNING id`,
        [cardId]
      );
      taskListId = newTaskListResult.rows[0].id;
    } else {
      taskListId = taskListResult.rows[0].id;
    }

    const maxPositionResult = await query(
      `SELECT COALESCE(MAX(position), 0) as max_pos FROM task WHERE task_list_id = $1`,
      [taskListId]
    );
    const position = maxPositionResult.rows[0].max_pos + 65536;

    const taskResult = await query(
      `INSERT INTO task (task_list_id, position, name, is_completed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name, is_completed, created_at`,
      [taskListId, position, taskData.name, taskData.isCompleted || false]
    );

    return taskResult.rows[0];
  }

  async getTasksForCard(cardId, plankaUserId) {
    const isOwner = await this.verifyCardOwnership(cardId, plankaUserId);
    if (!isOwner) {
      throw new Error('Unauthorized: You can only view tasks on your own cards');
    }

    const tasksResult = await query(
      `SELECT t.id, t.name, t.is_completed, t.created_at, t.updated_at
       FROM task t
       JOIN task_list tl ON t.task_list_id = tl.id
       WHERE tl.card_id = $1
       ORDER BY t.position`,
      [cardId]
    );

    return tasksResult.rows;
  }

  async verifyTaskOwnership(taskId, plankaUserId) {
    const result = await query(
      `SELECT t.id FROM task t
       JOIN task_list tl ON t.task_list_id = tl.id
       JOIN card c ON tl.card_id = c.id
       WHERE t.id = $1 AND c.creator_user_id = $2`,
      [taskId, plankaUserId]
    );
    return result.rows.length > 0;
  }

  async updateTask(taskId, plankaUserId, updates) {
    const isOwner = await this.verifyTaskOwnership(taskId, plankaUserId);
    if (!isOwner) {
      throw new Error('Unauthorized: You can only update your own tasks');
    }

    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.isCompleted !== undefined) {
      setClauses.push(`is_completed = $${paramCount++}`);
      values.push(updates.isCompleted);
    }

    if (setClauses.length === 0) {
      return null;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(taskId);

    const result = await query(
      `UPDATE task SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async linkCardToConversation(cardId, conversationId, appUserId, plankaUserId) {
    const convOwnerResult = await query(
      `SELECT user_id FROM conversations WHERE id = $1`,
      [conversationId]
    );
    
    if (convOwnerResult.rows.length === 0 || convOwnerResult.rows[0].user_id !== appUserId) {
      throw new Error('Unauthorized: You can only link cards to your own conversations');
    }

    const isOwner = await this.verifyCardOwnership(cardId, plankaUserId);
    if (!isOwner) {
      throw new Error('Unauthorized: You can only link your own cards');
    }

    await query(
      `INSERT INTO conversation_cards (conversation_id, card_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (conversation_id, card_id) DO NOTHING`,
      [conversationId, cardId]
    );
  }

  async getCardsForConversation(conversationId, appUserId, plankaUserId) {
    const convOwnerResult = await query(
      `SELECT user_id FROM conversations WHERE id = $1`,
      [conversationId]
    );
    
    if (convOwnerResult.rows.length === 0 || convOwnerResult.rows[0].user_id !== appUserId) {
      throw new Error('Unauthorized: You can only view cards from your own conversations');
    }

    const result = await query(
      `SELECT c.id, c.name, c.description, c.due_date, c.is_due_completed,
              l.name as list_name, c.created_at
       FROM card c
       JOIN list l ON c.list_id = l.id
       JOIN conversation_cards cc ON cc.card_id = c.id
       WHERE cc.conversation_id = $1 AND c.creator_user_id = $2
       ORDER BY c.created_at DESC`,
      [conversationId, plankaUserId]
    );

    return result.rows;
  }
}

export const plankaService = new PlankaService();
