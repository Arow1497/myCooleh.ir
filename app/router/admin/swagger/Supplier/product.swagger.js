/**
 * @swagger
 *  components:
 *      schemas:
 *          AddProduct:
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
 *                      description: the title of product
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
 *                      description: the describe about this product
 *                      example: توی این پست بطور کامل دررابطه با .... گفته شده
 *                  type: 
 *                      type: string
 *                      description: the product type (technicians or public)
 *                      enum:
 *                          -   technicians
 *                          -   public
 *                  field: 
 *                      type: string
 *                      description: the product type (technicians or public)
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
 *          Edit-Product:
 *              type: object    
 *              properties:
 *                  category:
 *                      type: string
 *                      example: 62822e4ff68cdded54aa928d
 *                  title:
 *                      type: string
 *                      description: the title of product
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
 *                      description: the describe about this product
 *                      example: توی این پست بطور کامل دررابطه با .... گفته شده
 *                  type: 
 *                      type: string
 *                      description: the product type (technicians or public)
 *                      enum:
 *                          -   technicians
 *                          -   public
 *                  field: 
 *                      type: string
 *                      description: the product type (technicians or public)
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
 *          Add-Comment-Product:
 *              type: object    
 *              properties:
 *                  parent:
 *                      type: string
 *                      example: 62822e4ff68cdded54aa928d
 *                  comment:
 *                      type: string
 *                      description: the title of product
 *                      example: کامنت شماره یک - متغیر 
 */
/**
 * @swagger
 *  /main_app/forum/create_product:
 *      post:
 *          tags: [Product]
 *          summary: create new Product
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data: 
 *                      schema:
 *                          $ref: '#/components/schemas/AddProduct'
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
 *  /main_app/forum/remove/{productID}:
 *      delete:
 *          tags: [Product]
 *          summary: delete One product
 *          parameters:
 *              -   in: path
 *                  name: productID
 *                  type: string
 *                  description: objectId of product
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
 *  /main_app/forum/edit/{productID}:
 *      patch:
 *          tags: [Product]
 *          summary: create and save product
 *          parameters:
 *              -   in: path
 *                  name: productID
 *                  type: string
 *                  required: true
 *                  description: id of product for update
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data:
 *                      schema:
 *                          $ref: '#/components/schemas/Edit-Product'
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
 *  /main_app/forum/add_comment/{productID}:
 *      product:
 *          tags: [Product]
 *          summary: create and save comment for product
 *          parameters:
 *              -   in: path
 *                  name: productID
 *                  type: string
 *                  required: true
 *                  description: id of product for update
 *          requestBody:
 *              required: true
 *              content:
 *                  application/x-www-form-urlencoded:
 *                      schema:
 *                          $ref: '#/components/schemas/Add-Comment-Product'
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
 *  /main_app/forum/get_comments_ofproduct/{productID}:
 *      get:
 *          tags: [Product]
 *          summary: get comments of a product
 *          parameters:
 *              -   in: path
 *                  name: productID
 *                  type: string
 *                  required: true
 *                  description: id of product for update
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
 *  /main_app/forum/get_products:
 *      get:
 *          tags: [ Product]
 *          summary: get all products
 *          responses:
 *              200:
 *                  description: success - get array of products
 */
/**
 * @swagger
 *  /main_app/forum/get_shareLink_ofproduct/{productID}:
 *      get:
 *          tags: [Product]
 *          summary: get shareLink of a product
 *          parameters:
 *              -   in: path
 *                  name: productID
 *                  type: string
 *                  required: true
 *                  description: id of product for update
 *          responses:
 *              200:
 *                  description: success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */