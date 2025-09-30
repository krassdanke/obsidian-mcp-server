# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated CI/CD processes.

## Docker Build and Push Workflow

The `docker-build-push.yml` workflow automatically builds and pushes Docker images to Docker Hub with multiple tags.

### Features

- **Multiple Tag Support**: Automatically creates and pushes:
  - `latest` tag (for main branch)
  - Version tags (e.g., `v1.0.0`, `1.0`, `1`)
  - Branch name tags (e.g., `main`, `develop`)
  - Commit hash tags (e.g., `main-abc1234`, `commit-abc1234`)

- **Multi-Platform Support**: Builds for both `linux/amd64` and `linux/arm64`

- **Smart Caching**: Uses GitHub Actions cache for faster builds

- **Health Check**: Includes automated testing of the built image

### Triggers

The workflow runs on:
- Push to `main` or `develop` branches
- Push of version tags (e.g., `v1.0.0`)
- Pull requests to `main` branch
- Release publication

### Required Secrets

Configure the following secrets in your GitHub repository settings:

1. `DOCKER_USERNAME`: Your Docker Hub username
2. `DOCKER_PASSWORD`: Your Docker Hub password or access token

### Setup Instructions

1. **Create Docker Hub Account** (if you don't have one):
   - Go to [Docker Hub](https://hub.docker.com)
   - Create an account and verify your email

2. **Create Access Token** (recommended over password):
   - Go to Docker Hub → Account Settings → Security
   - Create a new access token
   - Use this token as `DOCKER_PASSWORD`

3. **Configure GitHub Secrets**:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `DOCKER_USERNAME`: Your Docker Hub username
     - `DOCKER_PASSWORD`: Your Docker Hub access token

4. **Create Repository on Docker Hub**:
   - Create a repository named `obsidian-mcp-server` on Docker Hub
   - Make it public or private as needed

### Tag Strategy

The workflow uses the following tagging strategy:

| Event | Tags Created |
|-------|-------------|
| Push to main | `latest`, `main`, `main-<commit-hash>`, `commit-<commit-hash>` |
| Push to develop | `develop`, `develop-<commit-hash>`, `commit-<commit-hash>` |
| Version tag (v1.0.0) | `v1.0.0`, `1.0.0`, `1.0`, `1`, `latest` |
| Pull Request | No push (build only) |

### Usage

Once configured, the workflow will automatically:

1. Build the Docker image using the production target
2. Push to Docker Hub with appropriate tags
3. Run health checks to verify the image works
4. Cache build layers for faster subsequent builds

### Manual Trigger

You can also manually trigger the workflow:
- Go to Actions tab in your GitHub repository
- Select "Build and Push Docker Image"
- Click "Run workflow"

### Troubleshooting

**Build Fails**:
- Check that all required secrets are configured
- Verify Docker Hub repository exists
- Check Docker Hub username and token permissions

**Push Fails**:
- Ensure Docker Hub token has write permissions
- Verify repository name matches `obsidian-mcp-server`
- Check if Docker Hub rate limits are exceeded

**Health Check Fails**:
- Review the health endpoint implementation
- Check if all required environment variables are set
- Verify the application starts correctly in the container

### Customization

To modify the workflow:

1. **Change Image Name**: Update the `IMAGE_NAME` environment variable
2. **Add More Platforms**: Modify the `platforms` parameter in the build step
3. **Change Triggers**: Update the `on` section with different branches or events
4. **Modify Tags**: Update the `tags` section in the metadata extraction step

### Security Notes

- Never commit Docker Hub credentials to the repository
- Use access tokens instead of passwords when possible
- Regularly rotate access tokens
- Consider using Docker Hub organizations for team projects
