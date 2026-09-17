import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    openapi: "3.1.1",
    info: {
      title: "RV6 Project Management AI Connector",
      version: "1.0.0",
      description: "Read and update RV6 projects and milestones.",
    },
    servers: [{ url: origin }],
    security: [{ bearerAuth: [] }],
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
    },
    paths: {
      "/api/ai/projects": {
        get: {
          operationId: "listProjects",
          summary: "List all RV6 projects",
          responses: { "200": { description: "Portfolio snapshot" } },
        },
        post: {
          operationId: "createProject",
          summary: "Create an RV6 project",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "shortName", "summary", "owner"],
                  properties: {
                    name: { type: "string" },
                    shortName: { type: "string" },
                    summary: { type: "string" },
                    owner: { type: "string" },
                    progress: { type: "integer", minimum: 0, maximum: 100 },
                    status: { type: "string" },
                    priority: { type: "string", enum: ["Critical", "High", "Medium", "Low"] },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Created project" } },
        },
      },
      "/api/ai/projects/{id}": {
        patch: {
          operationId: "updateProject",
          summary: "Update a project, milestones, or timeline",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    progress: { type: "integer", minimum: 0, maximum: 100 },
                    health: { type: "string" },
                    status: { type: "string" },
                    priority: { type: "string" },
                    phase: { type: "string" },
                    owner: { type: "string" },
                    targetDate: { type: "string", format: "date" },
                    nextAction: { type: "string" },
                    blocker: { type: "string" },
                    milestones: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "progress", "status"],
                        properties: {
                          id: { type: "string" },
                          progress: { type: "integer", minimum: 0, maximum: 100 },
                          status: { type: "string" },
                        },
                      },
                    },
                    update: {
                      type: "object",
                      required: ["title", "body", "type"],
                      properties: {
                        title: { type: "string" },
                        body: { type: "string" },
                        type: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Updated project" } },
        },
      },
      "/api/ai/projects/{id}/milestones": {
        get: {
          operationId: "listMilestones",
          summary: "List project milestones",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Milestones" } },
        },
        post: {
          operationId: "createMilestone",
          summary: "Add a milestone",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    progress: { type: "integer", minimum: 0, maximum: 100 },
                    status: { type: "string" },
                    owner: { type: "string" },
                    dueLabel: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Created milestone" } },
        },
      },
    },
  });
}
