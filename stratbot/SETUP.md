# Setting up the Cracker Barrel Strategy Bot

This document provides instructions for setting up the environment variables required for the Cracker Barrel Strategy Bot to connect to the OpenAI Assistant.

## Environment Variables

The application requires two environment variables to be set in the `.env` file:

1. `VITE_OPENAI_API_KEY`: Your OpenAI API key
2. `VITE_OPENAI_ASSISTANT_ID`: The ID of your OpenAI Assistant

## Steps to Configure

1. Create a `.env` file in the root directory of the project (or copy from `.env.example`)
2. Add your OpenAI API key to the `VITE_OPENAI_API_KEY` variable
3. Create an Assistant in the OpenAI platform if you haven't already
4. Add the Assistant ID to the `VITE_OPENAI_ASSISTANT_ID` variable

Example:
```
# OpenAI API Configuration
VITE_OPENAI_API_KEY=your_actual_api_key_here
VITE_OPENAI_ASSISTANT_ID=your_actual_assistant_id_here
```

## Troubleshooting

If you see the error "Error: 400 Missing required parameter: 'assistant_id'", it means that the `VITE_OPENAI_ASSISTANT_ID` environment variable is not set correctly in your `.env` file.
