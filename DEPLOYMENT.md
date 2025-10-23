# Vercel Deployment Guide

This guide will help you deploy your Pop Quiz application to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. A PostgreSQL database (recommended providers):
   - Vercel Postgres (integrated with Vercel)
   - Neon (https://neon.tech) - Free tier available
   - Supabase (https://supabase.com) - Free tier available

## Step 1: Set Up PostgreSQL Database

### Option A: Vercel Postgres (Recommended)

1. Go to your Vercel dashboard
2. Select your project (or create a new one)
3. Go to the "Storage" tab
4. Click "Create Database" and select "Postgres"
5. Vercel will automatically set `DATABASE_URL` and `DIRECT_URL` environment variables

### Option B: Neon or Supabase

1. Sign up for an account
2. Create a new PostgreSQL database
3. Copy the connection string (you'll need this for environment variables)

## Step 2: Configure Environment Variables

In your Vercel project settings, add the following environment variables:

### Required Variables:

1. **DATABASE_URL**
   - Format: `postgresql://user:password@host:5432/database?connection_limit=5&pool_timeout=0`
   - Use the pooled connection URL if your provider offers it

2. **DIRECT_URL** (Optional but recommended)
   - Format: `postgresql://user:password@host:5432/database`
   - Use the direct connection URL for migrations

3. **NEXTAUTH_SECRET**
   - Generate with: `openssl rand -base64 32`
   - Or use: https://generate-secret.vercel.app/32

4. **NEXTAUTH_URL**
   - In production: `https://your-app-name.vercel.app`
   - Vercel may auto-set this, but verify it's correct

## Step 3: Deploy to Vercel

### Via Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Via GitHub Integration:

1. Push your code to GitHub
2. Go to Vercel dashboard
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js settings
6. Add environment variables (see Step 2)
7. Click "Deploy"

## Step 4: Run Database Migrations

After your first deployment:

```bash
# If using Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy

# Or run migrations through Vercel's build process
# (Already configured via postinstall script in package.json)
```

## Step 5: Verify Deployment

1. Visit your deployment URL
2. Test user registration
3. Test quiz creation
4. Test quiz taking functionality

## Important Notes

### Changes Made for Vercel Compatibility:

1. **Database**: Migrated from SQLite to PostgreSQL
   - SQLite requires persistent file system (not available on Vercel)
   - PostgreSQL is serverless-friendly

2. **Build Script**: Removed `--turbopack` flag
   - Vercel doesn't support Turbopack in production builds yet

3. **Connection Pooling**: Enhanced Prisma client configuration
   - Connections are now properly reused across function invocations
   - Prevents connection pool exhaustion

4. **Pagination**: Added to `/api/quizzes` endpoint
   - Prevents timeouts with large datasets
   - Parameters: `createdLimit`, `createdSkip`, `takenLimit`, `takenSkip`

5. **Request Validation**: Added size limits and payload validation
   - Max request size: 10MB
   - Max questions per quiz: 200
   - Prevents abuse and timeout issues

### Vercel Free Tier Limits:

- **Function Timeout**: 10 seconds
- **Function Memory**: 1024 MB
- **Bandwidth**: 100 GB/month
- **Build Time**: 45 minutes/month
- **Serverless Function Invocations**: Unlimited

### Monitoring & Debugging:

1. View logs in Vercel dashboard under "Deployments" → "Functions"
2. Enable detailed logging by checking error messages
3. Use Vercel Analytics for performance monitoring

### Database Connection Issues:

If you encounter connection issues:

1. Verify `DATABASE_URL` is correct
2. Ensure database allows connections from Vercel IPs (usually any IP: 0.0.0.0/0)
3. Check connection limits in your database provider
4. Consider using connection pooling services like PgBouncer

### Performance Optimization Tips:

1. Enable Vercel Edge Caching for static assets
2. Use Vercel's Image Optimization for quiz images
3. Consider implementing Redis for session caching (upgrade required)
4. Monitor function execution times in Vercel dashboard

## Troubleshooting

### Build Failures:

- Check that all environment variables are set
- Verify `DATABASE_URL` is accessible during build
- Review build logs in Vercel dashboard

### Runtime Errors:

- Check function logs in Vercel dashboard
- Verify database connection string
- Ensure migrations have been run

### Slow Performance:

- Check database query performance
- Verify pagination is being used
- Monitor function execution times
- Consider upgrading to Vercel Pro for better performance

## Support

For issues specific to:
- **Vercel**: https://vercel.com/support
- **Neon**: https://neon.tech/docs
- **Supabase**: https://supabase.com/docs
- **Prisma**: https://www.prisma.io/docs

## Next Steps

1. Set up a custom domain (Vercel Dashboard → Settings → Domains)
2. Enable Vercel Analytics for usage insights
3. Set up monitoring and alerts
4. Consider upgrading to Vercel Pro for better limits
