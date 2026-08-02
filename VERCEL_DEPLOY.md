# Deploying to Vercel 🚀

This application is fully configured for deployment on [Vercel](https://vercel.com).

## Option 1: Deploy with Git (Recommended)

1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Vercel will automatically detect **Vite** and load the settings from `vercel.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In the **Environment Variables** section on Vercel, add:
   - `GEMINI_API_KEY`: Your Google Gemini API key (if using AI features)
5. Click **Deploy**.

---

## Option 2: Deploy with Vercel CLI (Terminal)

1. Install the Vercel CLI globally (or run via npx):
   ```bash
   npm i -g vercel
   ```
2. Run the deploy command from your project root:
   ```bash
   vercel
   ```
3. Follow the CLI prompts to link and deploy your project.
4. To deploy to **production**, run:
   ```bash
   vercel --prod
   ```

---

## SPA Routing & Asset Caching

- The root `vercel.json` file handles **Single Page Application (SPA) rewrites**, ensuring that refreshing any route or opening deep links fallback to `/index.html` without `404 Not Found` errors.
- Static assets in `/assets/` are automatically served with immutable caching headers for optimal performance.
