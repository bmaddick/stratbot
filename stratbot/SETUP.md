# Setting up the Pathfinder

This document provides instructions for setting up the environment variables required for the Pathfinder to connect to the OpenAI Assistant.

## Environment Variables

The application requires two environment variables to be set in the `.env` file:

1. `VITE_OPENAI_API_KEY`: Your OpenAI API key
2. `VITE_OPENAI_ASSISTANT_ID`: The ID of your OpenAI Assistant

## Steps to Configure

1. Create a `.env` file in the root directory of the project by copying from `.env.example`:
   ```
   cp .env.example .env
   ```
2. Add your OpenAI API key to the `VITE_OPENAI_API_KEY` variable
3. Create an Assistant in the OpenAI platform if you haven't already
4. Add the Assistant ID to the `VITE_OPENAI_ASSISTANT_ID` variable

Example:
```
# OpenAI API Configuration
VITE_OPENAI_API_KEY=your_actual_api_key_here
VITE_OPENAI_ASSISTANT_ID=your_actual_assistant_id_here
```

## Avoiding Git Conflicts with Environment Variables

The `.env` file is excluded from git tracking to prevent your API keys from being committed to the repository and to avoid merge conflicts when pulling changes. However, if you've already committed your `.env` file, you may encounter conflicts when pulling changes.

### If you're experiencing conflicts with the `.env` file:

1. Untrack your local `.env` file from git:
   ```
   git rm --cached .env
   ```
   This removes the file from git tracking without deleting it from your local filesystem.

2. Make sure your `.env` file is in your `.gitignore` file (it should already be there).

3. Now you can pull changes without conflicts:
   ```
   git pull origin main
   ```

4. Your local `.env` file with your API keys will remain unchanged.

### For new clones of the repository:

1. Clone the repository
2. Copy the example environment file:
   ```
   cp .env.example .env
   ```
3. Add your API keys to the `.env` file

## Troubleshooting

If you see the error "Error: 400 Missing required parameter: 'assistant_id'", it means that the `VITE_OPENAI_ASSISTANT_ID` environment variable is not set correctly in your `.env` file.
