/**
 * @swagger
 *  components:
 *      schemas:
 *          GetOTP:
 *              type: object
 *              required:
 *                  -   mobile
 *              properties:
 *                  mobile:
 *                      type: string
 *                      description: the client mobile for signup/signin
 *          CheckOTP:
 *              type: object
 *              required:
 *                  -   mobile
 *                  -   code
 *              properties:
 *                  mobile:
 *                      type: string
 *                      description: the client mobile for signup/signin
 *                  code:
 *                      type: integer
 *                      description: reviced code from getOTP 
 *          RefreshToken:
 *              type: object
 *              required:
 *                  -   refreshToken
 *              properties:
 *                  refreshToken:
 *                      type: string
 *                      description: enter refresh-token for get fresh token and refresh-token
 *          GarageAcceptance:
 *              type: object
 *              required:
 *                  -   garageSerialNumber
 *                  -   carPlateNumber
 *                  -   carChassisNumber
 *                  -   carBuildYear
 *                  -   carModel
 *              properties:
 *                  garageSerialNumber:
 *                      type: string
 *                      description: enter garage serial number
 *                  carPlateNumber:
 *                      type: string
 *                      description: enter Car plate number
 *                  carChassisNumber:
 *                      type: string
 *                      description: enter Car chassis number
 *                  carBuildYear:
 *                      type: string
 *                      description: enter Car build year 
 *                  carModel:
 *                      type: string
 *                      description: enter Car model 
 */

/**
 * @swagger
 *  /client/auth/get-otp:
 *      post:
 *          tags: [Client-Requests]
 *          summary: login client in clientpanel with phone number
 *          description: one time password(OTP) login
 *          requestBody:
 *              required: true
 *              content: 
 *                  application/x-www-form-urlencoded:
 *                      schema:
 *                          $ref: '#/components/schemas/GetOTP'
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/GetOTP'
 *          responses:
 *              201: 
 *                  description: Success
 *              400: 
 *                  description: Bad Request
 *              401: 
 *                  description: Unauthorization
 *              500: 
 *                  description: Internal Server Error 
 */
/**
 * @swagger
 *  /client/auth/check-otp:
 *      post:
 *          tags : [Client-Requests]
 *          summary: chack-otp value in client controller
 *          description: chack otp with codce- mobile and expires date
 *          requestBody:
 *              required: true
 *              content:
 *                  application/x-www-form-urlencoded:
 *                      schema:
 *                          $ref: '#/components/schemas/CheckOTP'
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/CheckOTP'
 *          responses:
 *              201: 
 *                  description: Success
 *              400: 
 *                  description: Bad Request
 *              401: 
 *                  description: Unauthorization
 *              500: 
 *                  description: Internal Server Error 
 */
/**
 * @swagger
 *  /client/auth/refresh-token:
 *      post:
 *          tags: [Client-Requests]
 *          summary: send refresh token ffor get new token and refresh token
 *          description : fresh token
 *          requestBody:
 *              required: true
 *              content:
 *                  application/x-www-form-urlencoded:
 *                      schema:
 *                          $ref: '#/components/schemas/RefreshToken'
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/RefreshToken'
 *          responses:
 *              200:
 *                  description : success
 */
/**
 * @swagger
 *  /client/requests/acceptance:
 *      post:
 *          tags: [Client-Requests]
 *          summary: login client in clientpanel with phone number
 *          description: one time password(OTP) login
 *          requestBody:
 *              required: true
 *              content: 
 *                  application/x-www-form-urlencoded:
 *                      schema:
 *                          $ref: '#/components/schemas/GarageAcceptance'
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/GarageAcceptance'
 *          responses:
 *              201: 
 *                  description: Success
 *              400: 
 *                  description: Bad Request
 *              401: 
 *                  description: Unauthorization
 *              500: 
 *                  description: Internal Server Error 
 */