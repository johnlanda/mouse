# Mouse Frontend - AI Model Pricing Dashboard

A React-based dashboard for tracking AI model pricing across multiple providers.

## Features

- Real-time pricing data for AI models
- Historical price charts with trend visualization
- Dark/Light theme toggle
- Provider filtering
- Mock mode for development/demo

## Development

### Running in Mock Mode

You can run the frontend with mock data (no backend required) in two ways:

1. **Using environment variable:**
   ```bash
   # Create a .env file
   cp .env.example .env
   # Edit .env and set VITE_MOCK_MODE=true
   npm run dev
   ```

2. **Using URL parameter:**
   ```bash
   npm run dev
   # Then visit http://localhost:5173?mock=true
   ```

### Running with Backend

To run with the real backend:
```bash
# Make sure the backend is running on http://localhost:8000
cd ../backend
python main.py

# Run frontend (with VITE_MOCK_MODE=false or not set)
cd ../frontend
npm run dev
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
