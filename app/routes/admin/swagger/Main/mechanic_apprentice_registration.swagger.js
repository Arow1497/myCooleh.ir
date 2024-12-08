module.exports = {
  openapi: "3.0.0",
  info: {
    title: "Mechanic and Apprentice Registration API",
    version: "1.0.0",
    description: "API documentation for mechanic and apprentice registration endpoints"
  },
  servers: [
    {
      url: "http://localhost:3000/api"
    }
  ],
  paths: {
    "/mechanic/registration": {
      post: {
        summary: "Register a new mechanic",
        tags: ["MechanicRegistration"],
        operationId: "registerMechanic",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mobile: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  nationalIdNumber: { type: "string" },
                  city: { type: "string" },
                  province: { type: "string" },
                  location: { type: "string" },
                  garageName: { type: "string" },
                  garageSerialNumber: { type: "string" },
                  garageCity: { type: "string" },
                  garageAddress: { type: "string" },
                  garageLat_Lng: { type: "string" },
                  expertices: { type: "array", items: { type: "string" } },
                  garageMainField: { type: "string" },
                  garageField: { type: "string" },
                  sign: { type: "string" }
                },
                required: ["mobile", "firstName", "lastName", "nationalIdNumber", "city", "province", "location", "expertices"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  mobile: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  nationalIdNumber: { type: "string" },
                  city: { type: "string" },
                  province: { type: "string" },
                  location: { type: "string" },
                  garageName: { type: "string" },
                  garageSerialNumber: { type: "string" },
                  garageCity: { type: "string" },
                  garageAddress: { type: "string" },
                  garageLat_Lng: { type: "string" },
                  expertices: { type: "array", items: { type: "string" } },
                  garageMainField: { type: "string" },
                  garageField: { type: "string" },
                  sign: { type: "string" }
                },
                required: ["mobile", "firstName", "lastName", "nationalIdNumber", "city", "province", "location", "expertices"]
              }
            }
          }
        },
        responses: {
          201: {
            description: "Mechanic registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        mobile: { type: "string" },
                        profileName: { type: "string" },
                        garageName: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          },
          409: {
            description: "Conflict: User already registered",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/shagerd/registration": {
      post: {
        summary: "Register a new apprentice",
        tags: ["ApprenticeRegistration"],
        operationId: "registerApprentice",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mobile: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  nationalIdNumber: { type: "string" },
                  city: { type: "string" },
                  province: { type: "string" },
                  location: { type: "string" },
                  expertices: { type: "array", items: { type: "string" } }
                },
                required: ["mobile", "firstName", "lastName", "nationalIdNumber", "city", "province", "location", "expertices"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  mobile: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  nationalIdNumber: { type: "string" },
                  city: { type: "string" },
                  province: { type: "string" },
                  location: { type: "string" },
                  expertices: { type: "array", items: { type: "string" } }
                },
                required: ["mobile", "firstName", "lastName", "nationalIdNumber", "city", "province", "location", "expertices"]
              }
            }
          }
        },
        responses: {
          201: {
            description: "Apprentice registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        mobile: { type: "string" },
                        profileName: { type: "string" },
                        garageName: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          },
          409: {
            description: "Conflict: User already registered",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
