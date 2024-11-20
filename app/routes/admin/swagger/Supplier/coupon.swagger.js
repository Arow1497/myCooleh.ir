/**
 * @swagger
 *  components:
 *      schemas:
 *          AddCoupon:
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
 */
/**
 * @swagger
 *  components:
 *      schemas:
 *          Edit-Coupon:
 *              type: object    
 *              properties:
 *                  category:
 *                      type: string
 *                      example: 62822e4ff68cdded54aa928d
 *                  title:
 *                      type: string
 *                      description: the title of post
 *                      example: پست شماره یک - متغیر 
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
 */
/**
 * @swagger
 *  components:
 *      schemas:
 *          Add-Comment-Coupon:
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
 *  /main_app/garage/create_coupon:
 *      post:
 *          tags: [SupplierApp]
 *          summary: create new Post
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data: 
 *                      schema:
 *                          $ref: '#/components/schemas/AddCoupon'
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
 *  /main_app/garage/remove/{couponID}:
 *      delete:
 *          tags: [SupplierApp]
 *          summary: delete One coupon
 *          parameters:
 *              -   in: path
 *                  name: couponID
 *                  type: string
 *                  description: objectId of coupon
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
 *  /main_app/garage/edit/{couponID}:
 *      patch:
 *          tags: [SupplierApp]
 *          summary: create and save coupon
 *          parameters:
 *              -   in: path
 *                  name: couponID
 *                  type: string
 *                  required: true
 *                  description: id of coupon for update
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data:
 *                      schema:
 *                          $ref: '#/components/schemas/Edit-Coupon'
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
 *  /main_app/garage/add_comment/{couponID}:
 *      post:
 *          tags: [SupplierApp]
 *          summary: create and save comment for coupon
 *          parameters:
 *              -   in: path
 *                  name: couponID
 *                  type: string
 *                  required: true
 *                  description: id of coupon for update
 *          requestBody:
 *              required: true
 *              content:
 *                  application/x-www-form-urlencoded:
 *                      schema:
 *                          $ref: '#/components/schemas/Add-Comment-Coupon'
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
 *  /main_app/garage/get_comments_ofcoupon/{couponID}:
 *      get:
 *          tags: [SupplierApp]
 *          summary: get comments of a coupon
 *          parameters:
 *              -   in: path
 *                  name: couponID
 *                  type: string
 *                  required: true
 *                  description: id of coupon for update
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
 *  /main_app/garage/get_coupons:
 *      get:
 *          tags: [ SupplierApp]
 *          summary: get all posts
 *          responses:
 *              200:
 *                  description: success - get array of posts
 */
/**
 * @swagger
 *  /main_app/garage/get_shareLink_ofcoupon/{couponID}:
 *      get:
 *          tags: [SupplierApp]
 *          summary: get shareLink of a coupon
 *          parameters:
 *              -   in: path
 *                  name: couponID
 *                  type: string
 *                  required: true
 *                  description: id of coupon for update
 *          responses:
 *              200:
 *                  description: success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */