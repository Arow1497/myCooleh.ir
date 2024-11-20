/**
 * @swagger
 *  components:
 *      schemas:
 *          AddPost:
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
 *          Edit-Post:
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
 *  components:
 *      schemas:
 *          Add-Comment-Post:
 *              type: object    
 *              properties:
 *                  parent:
 *                      type: string
 *                      example: 62822e4ff68cdded54aa928d
 *                  comment:
 *                      type: string
 *                      description: the title of post
 *                      example: کامنت شماره یک - متغیر 
 */
/**
 * @swagger
 *  /main_app/forum/create_post:
 *      post:
 *          tags: [Post]
 *          summary: create new Post
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data: 
 *                      schema:
 *                          $ref: '#/components/schemas/AddPost'
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
 *  /main_app/forum/remove/{postID}:
 *      delete:
 *          tags: [Post]
 *          summary: delete One post
 *          parameters:
 *              -   in: path
 *                  name: postID
 *                  type: string
 *                  description: objectId of post
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
 *  /main_app/forum/edit/{postID}:
 *      patch:
 *          tags: [Post]
 *          summary: create and save post
 *          parameters:
 *              -   in: path
 *                  name: postID
 *                  type: string
 *                  required: true
 *                  description: id of post for update
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data:
 *                      schema:
 *                          $ref: '#/components/schemas/Edit-Post'
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
 *  /main_app/forum/add_comment/{postID}:
 *      post:
 *          tags: [Post]
 *          summary: create and save comment for post
 *          parameters:
 *              -   in: path
 *                  name: postID
 *                  type: string
 *                  required: true
 *                  description: id of post for update
 *          requestBody:
 *              required: true
 *              content:
 *                  application/x-www-form-urlencoded:
 *                      schema:
 *                          $ref: '#/components/schemas/Add-Comment-Post'
 *          
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
 *  /main_app/forum/get_comments_ofpost/{postID}:
 *      get:
 *          tags: [Post]
 *          summary: get comments of a post
 *          parameters:
 *              -   in: path
 *                  name: postID
 *                  type: string
 *                  required: true
 *                  description: id of post for update
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
 *  /main_app/forum/get_posts:
 *      get:
 *          tags: [ Post]
 *          summary: get all posts
 *          responses:
 *              200:
 *                  description: success - get array of posts
 */
/**
 * @swagger
 *  /main_app/forum/get_shareLink_ofpost/{postID}:
 *      get:
 *          tags: [Post]
 *          summary: get shareLink of a post
 *          parameters:
 *              -   in: path
 *                  name: postID
 *                  type: string
 *                  required: true
 *                  description: id of post for update
 *          responses:
 *              200:
 *                  description: success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */