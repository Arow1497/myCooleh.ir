/*
I am designing a nodejs Express js prismaORM application and platform for managing car
 repair garages and suppliers of automotive spare parts.
The file I sent you consists of models and the structure of users and various roles such as:
- garageOwner - mechanic - apprentice - supplier - freelancerMechanic - freelancerSupplier
It also includes various models like the user model, garage model, and models related to the RBAC
 (Role-Based Access Control) infrastructure, including:
- roles - permissions - roleResources - rolePermissions and so on.
I want to create a middleware for role and access control checks based on this infrastructure. For example:
- A mechanic with id: 2546 should have the access and permission to create and modify documents in a garage
 with id: 6546. - Similarly, every garage owner should have the ability to modify the documents of their own garage.
In summary, I am looking to implement a role-resources-permissions model. I would like you to create a comprehensive 
middleware for role and access control checks that covers all aspects of this platform. i want you to create just role
 management middleware for me...
*/












import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Middleware to check user roles and resource permissions
const checkRoleAccess = (resourceType, requiredPermission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id // Assuming authentication middleware sets user
      
      // Fetch user's roles
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: { role: { include: { rolePermissions: true } } }
      })

      // Check if user has system admin override
      const isSystemAdmin = await prisma.user.findUnique({
        where: { id: userId, isSystemAdmin: true }
      })

      if (isSystemAdmin) {
        return next() // System admins have full access
      }

      // Check specific resource permissions
      const hasPermission = userRoles.some(userRole => 
        userRole.role.rolePermissions.some(rolePerm => 
          rolePerm.permission.name === requiredPermission
        )
      )

      // Check resource-specific ownership or access
      const resourceId = req.params.resourceId || req.body.resourceId
      const resourceOwnershipCheck = await checkResourceOwnership(
        userId, 
        resourceType, 
        resourceId, 
        requiredPermission
      )

      if (hasPermission || resourceOwnershipCheck) {
        return next()
      }

      return res.status(403).json({ 
        error: 'Access Denied', 
        message: 'You do not have permission to perform this action' 
      })
    } catch (error) {
      console.error('Role Access Check Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// Helper function to check resource-specific ownership
const checkResourceOwnership = async (userId, resourceType, resourceId, permission) => {
  switch (resourceType) {
    case 'GARAGE':
      return checkGarageAccess(userId, resourceId, permission)
    case 'SUPPLIER_STORE':
      return checkSupplierStoreAccess(userId, resourceId, permission)
    case 'PROJECT':
      return checkProjectAccess(userId, resourceId, permission)
    default:
      return false
  }
}

// Specific resource ownership checks
const checkGarageAccess = async (userId, garageId, permission) => {
  const businessProfile = await prisma.businessProfile.findUnique({
    where: { userId },
    include: { 
      ownedGarage: true,
      mechanicAt: true,
      apprenticeAt: true 
    }
  })

  // Check if user owns the garage or is a mechanic/apprentice
  return businessProfile.ownedGarage.some(g => g.id === garageId) ||
         (businessProfile.mechanicAt?.id === garageId) ||
         (businessProfile.apprenticeAt?.id === garageId)
}

const checkSupplierStoreAccess = async (userId, storeId, permission) => {
  const businessProfile = await prisma.businessProfile.findUnique({
    where: { userId },
    include: { ownedSupplierStore: true }
  })

  // Check if user owns the supplier store
  return businessProfile.ownedSupplierStore.some(store => store.id === storeId)
}

const checkProjectAccess = async (userId, projectId, permission) => {
  const projectProfile = await prisma.projectProfile.findUnique({
    where: { userId },
    include: { 
      projectProvider: true, 
      projectRequester: true 
    }
  })

  // Check if user is project provider or requester
  return (projectProfile.projectProvider?.id === projectId) || 
         (projectProfile.projectRequester?.id === projectId)
}

// Example usage in route definitions
export const garageRoutes = (app) => {
  // Create a garage (requires CREATE permission)
  app.post('/garages', 
    checkRoleAccess('GARAGE', 'CREATE'), 
    createGarageHandler
  )

  // Update a specific garage (requires UPDATE permission)
  app.put('/garages/:resourceId', 
    checkRoleAccess('GARAGE', 'UPDATE'), 
    updateGarageHandler
  )

  // Delete a garage (requires DELETE permission)
  app.delete('/garages/:resourceId', 
    checkRoleAccess('GARAGE', 'DELETE'), 
    deleteGarageHandler
  )
}

export default checkRoleAccess