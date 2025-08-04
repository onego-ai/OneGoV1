# Setting Up GROQ API Key for Chat Function

## 🔑 Step 1: Get GROQ API Key

1. Go to [https://console.groq.com/](https://console.groq.com/)
2. Sign up or log in to your account
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy the API key (it starts with `gsk_`)

## ⚙️ Step 2: Set Environment Variable in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Scroll down to **Environment Variables**
5. Add a new variable:
   - **Name**: `GROQ_API_KEY`
   - **Value**: `gsk_your_actual_api_key_here`
6. Click **Save**

## 🚀 Step 3: Redeploy Function

After setting the environment variable, redeploy the function:

```bash
supabase functions deploy chat-with-tutor
```

## 🧪 Step 4: Test the Function

1. Go back to your app
2. Try the "Test Chat" button in the tutoring session
3. Check the browser console for detailed logs
4. The function should now work properly

## 🔍 Troubleshooting

### If you still get errors:

1. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Edge Functions
   - Click on `chat-with-tutor`
   - Check the "Logs" tab for error messages

2. **Verify API Key:**
   - Make sure the API key is correct
   - Ensure it starts with `gsk_`
   - Check if you have credits/quota available

3. **Test API Key:**
   ```bash
   curl -X POST https://api.groq.com/openai/v1/chat/completions \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "llama3-70b-8192",
       "messages": [{"role": "user", "content": "Hello"}],
       "max_tokens": 50
     }'
   ```

## 📊 Expected Response

Once working, you should see:
- ✅ "Test Successful" message
- ✅ Reply content in the toast
- ✅ Detailed logs in browser console
- ✅ Chat function working in interactive sessions

## 💡 Common Issues

- **"GROQ_API_KEY not configured"** → Set the environment variable
- **"Invalid API key"** → Check your API key format
- **"Rate limit exceeded"** → Check your GROQ account limits
- **"Function not found"** → Redeploy the function 