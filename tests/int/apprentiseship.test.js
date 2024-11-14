const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../../app'); // Adjust path based on your app structure
const prisma = new PrismaClient();

describe('Apprenticeship Notice API', () => {
  let authToken;
  let testUser;
  let testGarage;
  let testProject;
  let testNotice;

  beforeAll(async () => {
    // Create test user and get auth token
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword123'
      }
    });

    testGarage = await prisma.garage.create({
      data: {
        name: 'Test Garage',
        address: 'Test Address',
        garageOwner: { connect: { id: testUser.id } }
      }
    });

    testProject = await prisma.project.create({
      data: {
        title: 'Test Project',
        description: 'Test Description',
        requester: { connect: { id: testUser.id } }
      }
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await prisma.garage.deleteMany();
    await prisma.user.deleteMany();
    await prisma.project.deleteMany();
    await prisma.noticeApprenticeship.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/apprenticeship/create/:projectId', () => {
    it('should create a new apprenticeship notice', async () => {
      const response = await request(app)
        .post(`/api/v1/apprenticeship/create/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Test Notice')
        .field('description', 'Test Description')
        .field('budget', 1000)
        .attach('files', 'tests/fixtures/test-image.jpg');

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('notice');
      expect(response.body.data.notice.title).toBe('Test Notice');
      
      testNotice = response.body.data.notice;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post(`/api/v1/apprenticeship/create/${testProject.id}`)
        .field('title', 'Test Notice');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/apprenticeship/all', () => {
    it('should return all apprenticeship notices', async () => {
      const response = await request(app)
        .get('/api/v1/apprenticeship/all')
        .query({ city: 'Test City' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.notices)).toBe(true);
    });
  });

  describe('GET /api/v1/apprenticeship/:noticeApprenticeId', () => {
    it('should return a specific notice', async () => {
      const response = await request(app)
        .get(`/api/v1/apprenticeship/${testNotice.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.notice.id).toBe(testNotice.id);
    });

    it('should return 404 for non-existent notice', async () => {
      const response = await request(app)
        .get('/api/v1/apprenticeship/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/apprenticeship/:noticeApprenticeId', () => {
    it('should update an existing notice', async () => {
      const response = await request(app)
        .patch(`/api/v1/apprenticeship/${testNotice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Updated Notice')
        .field('description', 'Updated Description');

      expect(response.status).toBe(200);
      expect(response.body.data.notice.title).toBe('Updated Notice');
    });
  });

  describe('DELETE /api/v1/apprenticeship/:noticeApprenticeId', () => {
    it('should delete an existing notice', async () => {
      const response = await request(app)
        .delete(`/api/v1/apprenticeship/${testNotice.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/apprenticeship/bookmark/:noticeApprenticeId', () => {
    it('should toggle bookmark status', async () => {
      const response = await request(app)
        .post(`/api/v1/apprenticeship/bookmark/${testNotice.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Garage Routes', () => {
    it('should get garage apprentice requests', async () => {
      const response = await request(app)
        .get('/api/v1/apprenticeship/garage/requests')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('notices');
    });

    it('should get all garage active notices', async () => {
      const response = await request(app)
        .get('/api/v1/apprenticeship/garage/active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('activeNotices');
    });
  });

  describe('Apprentice Routes', () => {
    it('should get apprentice requests', async () => {
      const response = await request(app)
        .get('/api/v1/apprenticeship/apprentice/requests')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('requests');
    });
  });

  describe('Conversation Routes', () => {
    let conversationId;

    it('should create a transaction room', async () => {
      const response = await request(app)
        .post(`/api/v1/apprenticeship/conversation/${testNotice.transactionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('conversationId');
      conversationId = response.body.data.conversationId;
    });

    it('should send a message', async () => {
      const response = await request(app)
        .post(`/api/v1/apprenticeship/conversation/${conversationId}/message`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('content', 'Test message')
        .attach('files', 'tests/fixtures/test-image.jpg');

      expect(response.status).toBe(200);
      expect(response.body.data.messageData).toHaveProperty('content');
    });

    it('should get conversation messages', async () => {
      const response = await request(app)
        .get(`/api/v1/apprenticeship/conversation/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('messages');
    });
  });

  describe('Review Routes', () => {
    it('should add a review for apprentice request', async () => {
      const response = await request(app)
        .post(`/api/v1/apprenticeship/review/${testNotice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 5,
          comment: 'Great work!',
          projectId: testProject.id
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Complaint Routes', () => {
    let complaintId;

    it('should create a complaint', async () => {
      const response = await request(app)
        .post(`/api/v1/apprenticeship/complaint/${testNotice.transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('description', 'Test complaint')
        .attach('files', 'tests/fixtures/test-image.jpg');

      expect(response.status).toBe(200);
      complaintId = response.body.data.complaint.id;
    });

    it('should respond to a complaint', async () => {
      const response = await request(app)
        .post(`/api/v1/apprenticeship/complaint/${complaintId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('response', 'Test response')
        .attach('files', 'tests/fixtures/test-image.jpg');

      expect(response.status).toBe(200);
    });
  });
});