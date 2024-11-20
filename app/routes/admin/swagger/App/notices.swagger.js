/**
 * @swagger
 *  components:
 *      schemas:
 *          AddNotice:
 *              type: object
 *              required:
 *                  -   category
 *                  -   title
 *                  -   price       
 *                  -   type       
 *                  -   field           
 *              properties:
 *                  category:
 *                      type: string
 *                      example: 62822e4ff68cdded54aa928d
 *                  title:
 *                      type: string
 *                      description: the title of post
 *                      example: پست شماره یک - متغیر 
 *                  tags:
 *                      type: array
 *                      description: the title of product
 *                  price:
 *                      type: string
 *                      description: the title of product
 *                      example: 2500000
 *                  description: 
 *                      type: string
 *                      description: the describe about this post
 *                      example: توی این پست بطور کامل دررابطه با .... گفته شده
 *                  type: 
 *                      type: string
 *                      description: the post type (technicians or public)
 *                      enum:
 *                          -   technicians
 *                          -   public
 *                  field: 
 *                      type: string
 *                      description: the post type (technicians or public)
 *                      enum:
 *                          -   mechanici
 *                          -   bodyShop
 *                          -   autoService
 *                  images:
 *                      type: array
 *                      items:
 *                          type: string
 *                          format: binary
 *                  video: 
 *                      type: string
 *                      description: the file of video 
 *                      format: binary
 */
/**
 * @swagger
 *  components:
 *      schemas:
 *          Edit-Notice:
 *              type: object    
 *              properties:
 *                  category:
 *                      type: string
 *                      example: 62822e4ff68cdded54aa928d
 *                  title:
 *                      type: string
 *                      description: the title of post
 *                      example: پست شماره یک - متغیر 
 *                  tags:
 *                      type: array
 *                      description: the title of product
 *                  price:
 *                      type: string
 *                      description: the title of product
 *                      example: 2500000
 *                  description: 
 *                      type: string
 *                      description: the describe about this post
 *                      example: توی این پست بطور کامل دررابطه با .... گفته شده
 *                  type: 
 *                      type: string
 *                      description: the post type (technicians or public)
 *                      enum:
 *                          -   technicians
 *                          -   public
 *                  field: 
 *                      type: string
 *                      description: the post type (technicians or public)
 *                      enum:
 *                          -   mechanici
 *                          -   bodyShop
 *                          -   autoService
 *                  images:
 *                      type: array
 *                      items:
 *                          type: string
 *                          format: binary
 *                  video: 
 *                      type: string
 *                      description: the file of video 
 *                      format: binary
 */
/**
 * @swagger
 *  /main_app/forum/create_dnotice:
 *      post:
 *          tags: [DNotice]
 *          summary: create new DNotice
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data: 
 *                      schema:
 *                          $ref: '#/components/schemas/AddNotice'
 *          responses:
 *              201:
 *                  description: success - created
 *                  content:
 *                      application/json:
 *                          schema: 
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/remove_dnotice/{dnoticeID}:
 *      delete:
 *          tags: [DNotice]
 *          summary: delete One DNotice
 *          parameters:
 *              -   in: path
 *                  name: dnoticeID
 *                  type: string
 *                  description: objectId of DNotice
 *          responses:
 *              200:
 *                  description: success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/edit_dnotice/{dnoticeID}:
 *      patch:
 *          tags: [DNotice]
 *          summary: create and save DNotice
 *          parameters:
 *              -   in: path
 *                  name: dnoticeID
 *                  type: string
 *                  required: true
 *                  description: id of DNotice for update
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data:
 *                      schema:
 *                          $ref: '#/components/schemas/Edit-Notice'
 *          
 *          responses:
 *              200:
 *                  description: updated Product
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/get_dnotices:
 *      get:
 *          tags: [ DNotice]
 *          summary: get all DNotice
 *          responses:
 *              200:
 *                  description: success - get array of DNotice
 */
/**
 * @swagger
 *  /main_app/forum/get_shareLink_ofdnotice/{dnoticeID}:
 *      get:
 *          tags: [DNotice]
 *          summary: get shareLink of a DNotice
 *          parameters:
 *              -   in: path
 *                  name: dnoticeID
 *                  type: string
 *                  required: true
 *                  description: get share Link of DNotice
 *          responses:
 *              200:
 *                  description: success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/create_enotice:
 *      post:
 *          tags: [ENotice]
 *          summary: create new ENotice
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data: 
 *                      schema:
 *                          $ref: '#/components/schemas/AddNotice'
 *          responses:
 *              201:
 *                  description: success - created
 *                  content:
 *                      application/json:
 *                          schema: 
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/remove_enotice/{enoticeID}:
 *      delete:
 *          tags: [ENotice]
 *          summary: delete One ENotice
 *          parameters:
 *              -   in: path
 *                  name: enoticeID
 *                  type: string
 *                  description: objectId of ENotice
 *          responses:
 *              200:
 *                  description: success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/edit_enotice/{enoticeID}:
 *      patch:
 *          tags: [ENotice]
 *          summary: create and save ENotice
 *          parameters:
 *              -   in: path
 *                  name: enoticeID
 *                  type: string
 *                  required: true
 *                  description: id of ENotice for update
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data:
 *                      schema:
 *                          $ref: '#/components/schemas/Edit-Notice'
 *          
 *          responses:
 *              200:
 *                  description: updated Product
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/get_enotices:
 *      get:
 *          tags: [ ENotice]
 *          summary: get all ENotice
 *          responses:
 *              200:
 *                  description: success - get array of ENotice
 */
/**
 * @swagger
 *  /main_app/forum/get_shareLink_ofenotice/{enoticeID}:
 *      get:
 *          tags: [ENotice]
 *          summary: get shareLink of a ENotice
 *          parameters:
 *              -   in: path
 *                  name: enoticeID
 *                  type: string
 *                  required: true
 *                  description: get share Link of ENotice
 *          responses:
 *              200:
 *                  description: success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/create_taminNotice:
 *      post:
 *          tags: [TaminNotice]
 *          summary: create new TaminNotice
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data: 
 *                      schema:
 *                          $ref: '#/components/schemas/AddNotice'
 *          responses:
 *              201:
 *                  description: success - created
 *                  content:
 *                      application/json:
 *                          schema: 
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/remove_taminNotice/{taminNoticeID}:
 *      delete:
 *          tags: [TaminNotice]
 *          summary: delete One TaminNotice
 *          parameters:
 *              -   in: path
 *                  name: taminNoticeID
 *                  type: string
 *                  description: objectId of TaminNotice
 *          responses:
 *              200:
 *                  description: success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/edit_taminNotice/{taminNoticeID}:
 *      patch:
 *          tags: [TaminNotice]
 *          summary: create and save TaminNotice
 *          parameters:
 *              -   in: path
 *                  name: taminNoticeID
 *                  type: string
 *                  required: true
 *                  description: id of TaminNotice for update
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data:
 *                      schema:
 *                          $ref: '#/components/schemas/Edit-Notice'
 *          
 *          responses:
 *              200:
 *                  description: updated Product
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */
/**
 * @swagger
 *  /main_app/forum/get_taminNotices:
 *      get:
 *          tags: [ TaminNotice]
 *          summary: get all TaminNotice
 *          responses:
 *              200:
 *                  description: success - get array of TaminNotice
 */
/**
 * @swagger
 *  /main_app/forum/get_shareLink_oftaminNotice/{taminNoticeID}:
 *      get:
 *          tags: [TaminNotice]
 *          summary: get shareLink of a TaminNotice
 *          parameters:
 *              -   in: path
 *                  name: taminNoticeID
 *                  type: string
 *                  required: true
 *                  description: get share Link of TaminNotice
 *          responses:
 *              200:
 *                  description: success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */