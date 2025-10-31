# Auto Mode - Quick Test Guide

## ✅ What You Should See

### **Normal Conversation (Messages 1-19, 23-33)**
- ✅ Natural AI responses
- ✅ NO toast notifications
- ✅ NO "Switched to..." messages
- ✅ Fast responses for simple queries
- ✅ More detailed responses for complex queries

### **Action Requests (Messages 20-22)**
- ✅ Toast notification appears (e.g., "Switched to gpt-3.5-turbo")
- ✅ Model dropdown updates
- ✅ AI confirms the action

---

## ❌ What You Should NOT See

### **For Normal Conversation**
- ❌ Toast notifications popping up randomly
- ❌ "🤖 Executing AI action" in browser console
- ❌ Model dropdown changing without being asked
- ❌ "I'll switch to..." when you didn't ask

### **Backend Logs Red Flags**
- ❌ "🎯 AI wants to call function" for "Hello" or simple questions
- ❌ Errors or crashes
- ❌ Same model for all queries (should vary by complexity)

---

## 📋 Test Checklist

Copy this to track your progress:

```
SIMPLE QUERIES (Should use gpt-3.5-turbo or gpt-4o-mini):
[ ] Message 1: "Hello!"
[ ] Message 2: "How are you doing today?"
[ ] Message 3: "What's the weather like?"
[ ] Message 4: "What is 2 + 2?"
[ ] Message 5: "Who was the first president?"
[ ] Message 6: "What are the primary colors?"

MODERATE QUERIES (Should use gpt-4o-mini or gpt-4-turbo):
[ ] Message 7: Photosynthesis explanation
[ ] Message 8: HTML vs CSS
[ ] Message 9: Job interview advice

COMPLEX QUERIES (Should use gpt-4o or gpt-4-turbo):
[ ] Message 10: Quantum entanglement
[ ] Message 11: Artificial consciousness
[ ] Message 12: Database schema design

CONTEXT AWARENESS:
[ ] Message 13-16: Multi-turn coding conversation

EDGE CASES (Should NOT trigger functions):
[ ] Message 17: "Tell me about models"
[ ] Message 18: "I want to switch"
[ ] Message 19: "Change"

ACTION REQUESTS (SHOULD trigger functions):
[ ] Message 20: "Switch to GPT-3.5" ✅ Should show toast
[ ] Message 21: "Use GPT-4o for the next questions" ✅ Should show toast
[ ] Message 22: "Go back to Auto mode" ✅ Should show toast

POST-ACTION CONVERSATION:
[ ] Message 23-24: Return to smooth conversation

STRESS TEST:
[ ] Message 25-29: Rapid-fire simple queries

MIXED COMPLEXITY:
[ ] Message 30-33: Complexity switches
```

---

## 🔍 How to Check Backend Logs

### **Option 1: Real-time monitoring**
```bash
bash monitor_test.sh
```

### **Option 2: Manual check**
Look at the backend workflow logs in the Replit UI

### **Option 3: Search logs**
```bash
grep "Auto-selected" myaiagent-mvp/backend/logs/* | tail -20
grep "AI wants to call function" myaiagent-mvp/backend/logs/* | tail -20
```

---

## 📝 Expected Model Selection Pattern

| Query Type | Expected Model | Example |
|------------|---------------|---------|
| Greetings | gpt-3.5-turbo | "Hello!" |
| Simple facts | gpt-3.5-turbo or gpt-4o-mini | "What is 2+2?" |
| Explanations | gpt-4o-mini or gpt-4-turbo | "How does photosynthesis work?" |
| Complex reasoning | gpt-4o or gpt-4-turbo | "Explain quantum physics" |
| Code/technical | gpt-4o or gpt-4-turbo | "Design a database schema" |

---

## 🎯 Success Criteria Summary

**PASS** ✅
- 0 function calls for messages 1-19, 23-33
- 3 function calls for messages 20-22
- Natural conversation flow
- Appropriate model selection
- No errors

**FAIL** ❌
- Function calls on normal conversation
- Same model for everything
- Toast notifications for "Hello"
- Errors or crashes
- Lost conversation context

---

## 🐛 Common Issues to Report

If you find issues, note:
1. **Message number** that failed
2. **What you saw** (screenshot if possible)
3. **What you expected**
4. **Backend log output** for that message
5. **Browser console errors** (F12 → Console tab)

---

## 💡 Pro Tips

- Take your time between messages (don't rapid-fire too fast)
- Watch the backend logs as you test
- If you see a function call for "Hello", that's a CRITICAL bug
- Check browser console (F12) for "🤖 Executing AI action" logs
- Model switches should be SILENT (backend only) unless you explicitly request them

