module.exports = {
  openapi: "3.0.0",
  info: {
    title: "User Authentication API",
    version: "1.0.0",
    description: "API documentation for user authentication-related endpoints"
  },
  servers: [
    {
      url: "http://localhost:3000/api"
    }
  ],
  paths: {
    "/user/auth/request-otp": {
      post: {
        summary: "Request OTP",
         tags: ["Authentication"],
         operationId: "requestOtp",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mobile: { type: "string", description: "User's mobile number", example: "1234567890" }
                },
                required: ["mobile"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  mobile: { type: "string", description: "User's mobile number", example: "1234567890" }
                },
                required: ["mobile"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "OTP sent successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/verify-otp": {
      post: {
        summary: "Verify OTP",
         tags: ["Authentication"],
         operationId: "verifyOtp",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mobile: { type: "string", description: "User's mobile number", example: "1234567890" },
                  otp: { type: "string", description: "OTP received", example: "123456" }
                },
                required: ["mobile", "otp"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  mobile: { type: "string", description: "User's mobile number", example: "1234567890" },
                  otp: { type: "string", description: "OTP received", example: "123456" }
                },
                required: ["mobile", "otp"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "OTP verified successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" },
                        token: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/refresh-token": {
      post: {
        summary: "Refresh Token",
         tags: ["Authentication"],
         operationId: "refreshToken",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  refreshToken: { type: "string", description: "Refresh token", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
                },
                required: ["refreshToken"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  refreshToken: { type: "string", description: "Refresh token", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
                },
                required: ["refreshToken"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Token refreshed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" },
                        token: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/logout": {
      post: {
        summary: "Logout",
         tags: ["Authentication"],
         operationId: "logout",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  token: { type: "string", description: "Access token", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
                },
                required: ["token"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  token: { type: "string", description: "Access token", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
                },
                required: ["token"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/complete-profile": {
      post: {
        summary: "Complete Profile",
         tags: ["Authentication"],
         operationId: "completeProfile",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  firstName: { type: "string", description: "First name", example: "John" },
                  lastName: { type: "string", description: "Last name", example: "Doe" },
                  email: { type: "string", description: "Email address", example: "john.doe@example.com" }
                },
                required: ["firstName", "lastName", "email"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  firstName: { type: "string", description: "First name", example: "John" },
                  lastName: { type: "string", description: "Last name", example: "Doe" },
                  email: { type: "string", description: "Email address", example: "john.doe@example.com" }
                },
                required: ["firstName", "lastName", "email"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Profile completed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/update-mobile": {
      post: {
        summary: "Update Mobile",
         tags: ["Authentication"],
         operationId: "updateMobile",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  newMobile: { type: "string", description: "New mobile number", example: "0987654321" }
                },
                required: ["newMobile"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  newMobile: { type: "string", description: "New mobile number", example: "0987654321" }
                },
                required: ["newMobile"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Mobile number updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/deactivate-account": {
      post: {
        summary: "Deactivate Account",
         tags: ["Authentication"],
         operationId: "deactivateAccount",
        responses: {
          200: {
            description: "Account deactivated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/reactivate-account": {
      post: {
        summary: "Reactivate Account",
         tags: ["Authentication"],
         operationId: "reactivateAccount",
        responses: {
          200: {
            description: "Account reactivated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/update-business-profile": {
      post: {
        summary: "Update Business Profile",
         tags: ["Authentication"],
         operationId: "updateBusinessProfile",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  businessName: { type: "string", description: "Business name", example: "ABC Company" },
                  businessAddress: { type: "string", description: "Business address", example: "123 Main St" }
                },
                required: ["businessName", "businessAddress"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  businessName: { type: "string", description: "Business name", example: "ABC Company" },
                  businessAddress: { type: "string", description: "Business address", example: "123 Main St" }
                },
                required: ["businessName", "businessAddress"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Business profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/update-social-profile": {
      post: {
        summary: "Update Social Profile",
         tags: ["Authentication"],
         operationId: "updateSocialProfile",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  socialMediaLinks: { type: "array", items: { type: "string" }, example: ["https://facebook.com/user", "https://twitter.com/user"] }
                },
                required: ["socialMediaLinks"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  socialMediaLinks: { type: "array", items: { type: "string" }, example: ["https://facebook.com/user", "https://twitter.com/user"] }
                },
                required: ["socialMediaLinks"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Social profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/update-location-info": {
      post: {
        summary: "Update Location Info",
         tags: ["Authentication"],
         operationId: "updateLocationInfo",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  location: { type: "string", description: "User's location", example: "New York" }
                },
                required: ["location"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  location: { type: "string", description: "User's location", example: "New York" }
                },
                required: ["location"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Location info updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/update-financial-info": {
      post: {
        summary: "Update Financial Info",
         tags: ["Authentication"],
         operationId: "updateFinancialInfo",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  bankAccount: { type: "string", description: "Bank account number", example: "1234567890" }
                },
                required: ["bankAccount"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  bankAccount: { type: "string", description: "Bank account number", example: "1234567890" }
                },
                required: ["bankAccount"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Financial info updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/update-user-status": {
      post: {
        summary: "Update User Status",
         tags: ["Authentication"],
         operationId: "updateUserStatus",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", description: "User status", example: "active" }
                },
                required: ["status"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", description: "User status", example: "active" }
                },
                required: ["status"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "User status updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/update-profile-media": {
      post: {
        summary: "Update Profile Media",
         tags: ["Authentication"],
         operationId: "updateProfileMedia",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  profilePicture: { type: "string", description: "Profile picture URL", example: "https://example.com/profile.jpg" }
                },
                required: ["profilePicture"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  profilePicture: { type: "string", description: "Profile picture URL", example: "https://example.com/profile.jpg" }
                },
                required: ["profilePicture"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Profile media updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/update-user-roles": {
      post: {
        summary: "Update User Roles",
         tags: ["Authentication"],
         operationId: "updateUserRoles",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  roles: { type: "array", items: { type: "string" }, example: ["admin", "user"] }
                },
                required: ["roles"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  roles: { type: "array", items: { type: "string" }, example: ["admin", "user"] }
                },
                required: ["roles"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "User roles updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/reset-password": {
      post: {
        summary: "Reset Password",
         tags: ["Authentication"],
         operationId: "resetPassword",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  password: { type: "string", description: "New password", example: "newpassword123" }
                },
                required: ["password"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  password: { type: "string", description: "New password", example: "newpassword123" }
                },
                required: ["password"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Password reset successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/user/auth/request-account-deletion": {
      post: {
        summary: "Request Account Deletion",
         tags: ["Authentication"],
         operationId: "requestAccountDeletion",
        responses: {
          200: {
            description: "Account deletion request submitted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" }
                      }
                    }
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
