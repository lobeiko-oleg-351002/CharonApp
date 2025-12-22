# Charon Metrics Dashboard

Angular frontend application for the Charon microservices architecture.

## Features

- **GraphQL Integration**: Uses Apollo Client to connect to the GraphQL Gateway
- **Real-time Updates**: SignalR integration for live metric notifications
- **Dashboard Components**:
  - Latest values display
  - Interactive charts (Chart.js)
  - Aggregations by type/location
- **Filtering & Search**: Filter metrics by type, date range, and search terms
- **Responsive Design**: Mobile-friendly UI
- **Error Handling**: Comprehensive error and loading state management

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
npm install
```

### Running Locally

```bash
npm start
```

The app will be available at `http://localhost:4200`

### Building for Production

```bash
npm run build
```

## Configuration

Update the GraphQL endpoint in `src/main.ts` if needed:

```typescript
uri: 'http://localhost:5004/graphql'
```

Update the SignalR hub URL in `src/app/services/signalr.service.ts`:

```typescript
.withUrl('http://localhost:5004/metricsHub')
```

## Docker

Build and run with Docker:

```bash
docker build -t charon-app .
docker run -p 5005:80 charon-app
```

## Architecture

- **Components**: Standalone Angular components
- **Services**: GraphQL and SignalR services
- **Models**: TypeScript interfaces for type safety
- **Styling**: SCSS with responsive design

