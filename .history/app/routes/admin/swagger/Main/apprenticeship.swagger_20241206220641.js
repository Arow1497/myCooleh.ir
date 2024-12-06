module.exports = {
  openapi: "3.0.0",
  info: {
    title: "Apprenticeship API",
    version: "1.0.0",
    description: "API documentation for apprenticeship-related endpoints"
  },
  servers: [
    {
      url: "http://localhost:3000/api"
    }
  ],
  paths: {
    "/apprenticeship/create/{projectID}": {
      post: {
        summary: "Create a new notice",
        tags: ["ApprenticeNotice"],
         operationId: "createNewNoticeApprentice",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  city: { type: "string" },
                  budget: {type: "object", properties: { amount: { type: "number", description: "مبلغ", example: 1000 },
                  type: { type: "string", enum: ['hourly', 'daily', 'monthly'], description: "نوع پرداخت", example: "hourly" } } },
                  expertices: { type: "string", enum: ['JOLOBANDI', 'ELECTRITIAN', 'ENGINEGEARBOX', 'OILAUTOSERVICE',
                    'BODYREPAIR', 'PDRDENT'] },
                  requirements: { type: "array", items: { type: "string" }, example: ["مورد1", "مورد2", "مورد3"] }
                },
                required: ["title", "description", "city", "budget", "expertices"]
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  city: { type: "string" },
                  budget: {type: "object", properties: { amount: { type: "number", description: "مبلغ", example: 1000 },
                   type: { type: "string", enum: ['hourly', 'daily', 'monthly'], description: "نوع پرداخت", example: "hourly" } } },
                  expertices: { type: "string", enum: ['JOLOBANDI', 'ELECTRITIAN', 'ENGINEGEARBOX', 'OILAUTOSERVICE',
                  'BODYREPAIR', 'PDRDENT'] },
                  requirements: { type: "array", items: { type: "string" }, example: ["مورد1", "مورد2", "مورد3"] },
                },
                required: ["title", "description", "city", "budget", "expertices"]
              }
            }
          },
        },
        responses: {
          201: {
            description: "Notice created successfully",
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
                        notice: { type: "object" },
                        share: { type: "object" }
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
    "/apprenticeship/": {
      get: {
        summary: "Get all notices",
        tags: ["ApprenticeNotice"],
         operationId: "getAllNoticeApprentice",
        responses: {
          200: {
            description: "Notices retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        notices: { type: "array", items: { type: "object" } }
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
    "/apprenticeship/{noticeApprenticeId}": {
      get: {
        summary: "Get a notice by ID",
        tags: ["ApprenticeNotice"],
         operationId: "getOneNoticeApprenticeById",
        parameters: [
          {
            name: "noticeApprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Notice retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        notice: { type: "object" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        summary: "Remove a notice by ID",
        tags: ["ApprenticeNotice"],
         operationId: "removeNoticeApprenticeById",
        parameters: [
          {
            name: "noticeApprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Notice removed successfully",
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
      },
      put: {
        summary: "Edit a notice by ID",
        tags: ["ApprenticeNotice"],
         operationId: "editNoticeApprenticesById",
        parameters: [
          {
            name: "noticeApprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  city: { type: "string" },
                  salary: { type: "number" },
                  duration: { type: "string" },
                  skills: { type: "array", items: { type: "string" } }
                }
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  city: { type: "string" },
                  salary: { type: "number" },
                  duration: { type: "string" },
                  skills: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Notice edited successfully",
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
                        notice: { type: "object" }
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
    "/apprenticeship/{noticeApprenticeId}/bookmark": {
      post: {
        summary: "Toggle bookmark for a notice",
        tags: ["ApprenticeNotice"],
         operationId: "toggleBookmark",
        parameters: [
          {
            name: "noticeApprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Bookmark toggled successfully",
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
    "/apprenticeship/garage": {
      get: {
        summary: "Get all garage notices",
        tags: ["ApprenticeNotice"],
         operationId: "getAllGarageNoticeApprentices",
        responses: {
          200: {
            description: "Garage notices retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        notices: { type: "array", items: { type: "object" } },
                        pagination: {
                          type: "object",
                          properties: {
                            total: { type: "integer" },
                            pages: { type: "integer" },
                            currentPage: { type: "integer" },
                            perPage: { type: "integer" }
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
    },
    "/apprenticeship/to-itself": {
      get: {
        summary: "Get all notices to itself",
        tags: ["ApprenticeNotice"],
         operationId: "getAllNoticeApprenticesToItself",
        responses: {
          200: {
            description: "Notices to itself retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        requests: { type: "array", items: { type: "object" } },
                        pagination: {
                          type: "object",
                          properties: {
                            total: { type: "integer" },
                            pages: { type: "integer" },
                            currentPage: { type: "integer" },
                            perPage: { type: "integer" }
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
    },
    "/apprenticeship/apprentice/active": {
      get: {
        summary: "Get all active apprentice notices for an apprentice",
        tags: ["ApprenticeNotice"],
         operationId: "getApprenticeAllActiveApprenticeNoticeApps",
        responses: {
          200: {
            description: "Active apprentice notices retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        activeNotices: { type: "array", items: { type: "object" } },
                        pagination: {
                          type: "object",
                          properties: {
                            total: { type: "integer" },
                            pages: { type: "integer" },
                            currentPage: { type: "integer" },
                            perPage: { type: "integer" }
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
    },
    "/apprenticeship/garage/active": {
      get: {
        summary: "Get all active apprentice notices for a garage",
        tags: ["ApprenticeNotice"],
         operationId: "getGarageAllActiveApprenticeNoticeApps",
        responses: {
          200: {
            description: "Active garage notices retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    activeNotices: { type: "array", items: { type: "object" } },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        pages: { type: "integer" },
                        currentPage: { type: "integer" },
                        perPage: { type: "integer" }
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
    "/apprenticeship/{noticeApprenticeId}/share": {
      post: {
        summary: "Share a notice",
        tags: ["ApprenticeNotice"],
         operationId: "shareNoticeApprentice",
        parameters: [
          {
            name: "noticeApprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Notice shared successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        share: { type: "object" }
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
    "/apprenticeship/{noticeApprenticeId}/cowork/{apprenticeId}": {
      post: {
        summary: "Add cowork request for a notice",
        tags: ["ApprenticeNotice"],
         operationId: "addCoworkReqForNoticeApprentice",
        parameters: [
          {
            name: "noticeApprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          },
          {
            name: "apprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  role: { type: "string" },
                  message: { type: "string" }
                }
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  role: { type: "string" },
                  message: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Cowork request added successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        noticeApprenticeAppReqs: { type: "object" }
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
    "/apprenticeship/cowork/requests": {
      get: {
        summary: "Show cowork requests for a requester garage",
        tags: ["ApprenticeNotice"],
         operationId: "showCoworkRequestsForRequesterGarage",
        responses: {
          200: {
            description: "Cowork requests retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        requests: { type: "array", items: { type: "object" } }
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
    "/apprenticeship/cowork/{apprenticeId}/{noticeApprenticeId}": {
      post: {
        summary: "Add apprentice to a request",
        tags: ["ApprenticeNotice"],
         operationId: "addApprenticeToRequest",
        parameters: [
          {
            name: "apprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          },
          {
            name: "noticeApprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  role: { type: "string" },
                  message: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Apprentice added successfully",
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
                        result: { type: "object" }
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
    "/apprenticeship/cowork/{noticeApprenticeId}/{apprenticeId}": {
      delete: {
        summary: "Delete an apprentice from a notice",
        tags: ["ApprenticeNotice"],
         operationId: "deleteThisApprenticeFromNoticeApprentice",
        parameters: [
          {
            name: "noticeApprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          },
          {
            name: "apprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Apprentice deleted successfully",
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
    "/apprenticeship/{noticeApprenticeId}/refuse": {
      post: {
        summary: "Apprentice refusing from a notice",
        tags: ["ApprenticeNotice"],
         operationId: "apprenticeRefusingFromThisNoticeApprenticeship",
        parameters: [
          {
            name: "noticeApprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Refusal successful",
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
    "/apprenticeship/transaction/{transactionId}/confirm": {
      post: {
        summary: "Confirm transaction completion",
        tags: ["ApprenticeNotice"],
         operationId: "confirmTransactionCompletion",
        parameters: [
          {
            name: "transactionId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Transaction confirmed successfully",
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
    "/apprenticeship/transaction/{transactionId}/complaint": {
      post: {
        summary: "Create a complaint",
        tags: ["ApprenticeNotice"],
         operationId: "createComplaint",
        parameters: [
          {
            name: "transactionId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  evidence: { type: "array", items: { type: "string" } }
                }
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  evidence: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Complaint created successfully",
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
    "/apprenticeship/complaint/{complaintId}": {
      delete: {
        summary: "Remove and regret a complaint by requester",
        tags: ["ApprenticeNotice"],
         operationId: "removeAndRegretComplaintByrequester",
        parameters: [
          {
            name: "complaintId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Complaint removed successfully",
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
    "/apprenticeship/complaint/{complaintId}/respond": {
      post: {
        summary: "Respond to a complaint",
        tags: ["ApprenticeNotice"],
         operationId: "respondToComplaint",
        parameters: [
          {
            name: "complaintId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  response: { type: "string" },
                  evidence: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Complaint response successful",
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
                        complaint: { type: "object" }
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
    "/apprenticeship/{noticeApprenticeId}/review": {
      post: {
        summary: "Add review for a notice",
        tags: ["ApprenticeNotice"],
         operationId: "addReviewForNoticeApprentice",
        parameters: [
          {
            name: "noticeApprenticeId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  rating: { type: "number" },
                  comment: { type: "string" }
                }
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  rating: { type: "number" },
                  comment: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Review added successfully",
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
    "/apprenticeship/transaction/{transactionId}/room": {
      post: {
        summary: "Create a transaction room",
        tags: ["ApprenticeNotice"],
         operationId: "createTransactionRoom",
        parameters: [
          {
            name: "transactionId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          201: {
            description: "Transaction room created successfully",
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
                        conversationId: { type: "string" }
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
    "/apprenticeship/conversation/{conversationId}/message": {
      post: {
        summary: "Send a message",
        tags: ["ApprenticeNotice"],
         operationId: "sendMessage",
        parameters: [
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  attachments: { type: "array", items: { type: "string" } }
                }
              }
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  attachments: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Message sent successfully",
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
                        messageData: { type: "object" }
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
    "/apprenticeship/conversation/{conversationId}/messages": {
      get: {
        summary: "Get messages",
        tags: ["ApprenticeNotice"],
         operationId: "getMessages",
        parameters: [
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Messages retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        messages: { type: "array", items: { type: "object" } },
                        pagination: {
                          type: "object",
                          properties: {
                            currentPage: { type: "integer" },
                            totalPages: { type: "integer" },
                            totalMessages: { type: "integer" },
                            limit: { type: "integer" }
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
    },
    "/apprenticeship/conversations": {
      get: {
        summary: "Get user conversations",
        tags: ["ApprenticeNotice"],
         operationId: "getUserConversations",
        responses: {
          200: {
            description: "Conversations retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        conversations: { type: "array", items: { type: "object" } },
                        pagination: {
                          type: "object",
                          properties: {
                            currentPage: { type: "integer" },
                            totalPages: { type: "integer" },
                            totalConversations: { type: "integer" },
                            limit: { type: "integer" }
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
    },
    "/apprenticeship/conversation/{conversationId}/mark-read": {
      post: {
        summary: "Mark messages as read",
        tags: ["ApprenticeNotice"],
         operationId: "markMessagesAsRead",
        parameters: [
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Messages marked as read successfully",
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
                        count: { type: "integer" }
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
    "/apprenticeship/conversation/{conversationId}/details": {
      get: {
        summary: "Get conversation details",
        tags: ["ApprenticeNotice"],
         operationId: "getConversationDetails",
        parameters: [
          {
            name: "conversationId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Conversation details retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        conversation: { type: "object" }
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
