This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API And Environment

The frontend expects the FastAPI service to be available through `NEXT_PUBLIC_API_BASE_URL`
or `http://localhost:8000` by default.

For production, configure the backend with real values instead of the development defaults:

```env
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DB
JWT_SECRET=<generate-a-long-random-secret>
FRONTEND_URL=https://your-frontend-domain.example
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-or-app-password
SMTP_FROM_EMAIL=no-reply@your-domain.example
ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=<strong-temporary-bootstrap-password>
```

The backend refuses to start in production if `JWT_SECRET` is still the placeholder or SMTP credentials are missing. In development, missing SMTP credentials cause new accounts to be verified automatically so local testing is not blocked.

## Validation And Security Notes

Forms now show field-level validation on blur/change and on submit. Backend validation returns user-facing messages, rate limits auth/reset endpoints, invalidates reset tokens after use, adds security headers, logs email delivery failures, and exposes `GET /health` with database and SMTP configuration status.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
