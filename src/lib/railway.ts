// src/lib/railway.ts
const API = 'https://backboard.railway.app/graphql/v2'

async function gql(query: string, variables: Record<string, any> = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RAILWAY_API_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}

export async function getServiceStatus() {
  const data = await gql(
    `query($serviceId: String!) {
      service(id: $serviceId) {
        id
        name
        serviceInstances {
          edges {
            node {
              numReplicas
              latestDeployment {
                id
                status
                createdAt
              }
            }
          }
        }
      }
    }`,
    { serviceId: process.env.RAILWAY_MC_SERVICE_ID }
  )
  const instance = data?.service?.serviceInstances?.edges?.[0]?.node
  const deployment = instance?.latestDeployment
  return {
    replicas: instance?.numReplicas ?? 0,
    deployStatus: deployment?.status ?? 'OFFLINE',
    deploymentId: deployment?.id,
    createdAt: deployment?.createdAt,
  }
}

export async function scaleService(replicas: 0 | 1) {
  return gql(
    `mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
    }`,
    {
      serviceId: process.env.RAILWAY_MC_SERVICE_ID,
      environmentId: process.env.RAILWAY_ENVIRONMENT_ID,
      input: { numReplicas: replicas },
    }
  )
}

export async function redeployService() {
  return gql(
    `mutation($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }`,
    {
      serviceId: process.env.RAILWAY_MC_SERVICE_ID,
      environmentId: process.env.RAILWAY_ENVIRONMENT_ID,
    }
  )
}

export async function getServiceVariables(): Promise<Record<string, string>> {
  const data = await gql(
    `query($projectId: String!, $environmentId: String!, $serviceId: String!) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
    }`,
    {
      projectId: process.env.RAILWAY_PROJECT_ID,
      environmentId: process.env.RAILWAY_ENVIRONMENT_ID,
      serviceId: process.env.RAILWAY_MC_SERVICE_ID,
    }
  )
  return data?.variables ?? {}
}

export async function upsertVariable(name: string, value: string) {
  return gql(
    `mutation($input: VariableUpsertInput!) { variableUpsert(input: $input) }`,
    {
      input: {
        projectId: process.env.RAILWAY_PROJECT_ID,
        environmentId: process.env.RAILWAY_ENVIRONMENT_ID,
        serviceId: process.env.RAILWAY_MC_SERVICE_ID,
        name,
        value,
      },
    }
  )
}

// Update RAM — changes MC_MEMORY env var then triggers redeploy
export async function updateRam(ram: string) {
  await upsertVariable('MC_MEMORY', ram)
  await redeployService()
}
