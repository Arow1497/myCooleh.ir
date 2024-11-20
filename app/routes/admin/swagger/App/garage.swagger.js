/**
 * @swagger
 *  components:
 *      schemas:
 *          Garage:
 *              type: object
 *              required:
 *                  -   garage_name
 *                  -   telephone
 *                  -   first_name
 *                  -   last_name
 *              properties:
 *                  garage_name:
 *                      type: string
 *                      description: the name of garage
 *                  telephone:
 *                      type: string
 *                      description: the telephone of garage
 *                  first_name:
 *                      type: string
 *                      description: the name of garageOwner
 *                  last_name:
 *                      type: string
 *                      description: the name of garageOwner
 *                  images:
 *                      type: array
 *                      items:
 *                          type: string
 *                          format: binary
 *                  garageMainField: 
 *                      type: string
 *                      description: the main fiels of garage
 *                      enum:
 *                          -   oilService
 *                          -   mechanici
 *                          -   bodyShop
 *                  garageField: 
 *                      type: string
 *                      description: the post type (technicians or public)
 *                      enum:
 *                          -   baterySazi
 *                          -   joloBandi
 *                          -   oilService
 *                          -   bodyShop
 *                          -   mechanoci
 *                          -   radiatSazi
 */
/**
 * @swagger
 *  components:
 *      schemas:
 *          AddMetric:
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
 *          Edit-Metric:
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
 *          Add-Comment-Metric:
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
 *  /main_app/garage/registration:
 *      post:
 *          tags: [Garage(UserPanel)]
 *          summary: create new Garage 
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data:
 *                      schema:
 *                          $ref: '#/components/schemas/Garage'
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Garage'
 *          responses:
 *              201:
 *                  description: success
 */
/**
 * @swagger
 *  /main_app/garage/create_metric:
 *      post:
 *          tags: [Garage(UserPanel)]
 *          summary: create new Post
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data: 
 *                      schema:
 *                          $ref: '#/components/schemas/AddMetric'
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
 *  /main_app/garage/remove/{metricID}:
 *      delete:
 *          tags: [Garage(UserPanel)]
 *          summary: delete One metric
 *          parameters:
 *              -   in: path
 *                  name: metricID
 *                  type: string
 *                  description: objectId of metric
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
 *  /main_app/garage/edit/{metricID}:
 *      patch:
 *          tags: [Garage(UserPanel)]
 *          summary: create and save metric
 *          parameters:
 *              -   in: path
 *                  name: metricID
 *                  type: string
 *                  required: true
 *                  description: id of metric for update
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data:
 *                      schema:
 *                          $ref: '#/components/schemas/Edit-Metric'
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
 *  /main_app/garage/add_comment/{metricID}:
 *      post:
 *          tags: [Garage(UserPanel)]
 *          summary: create and save comment for metric
 *          parameters:
 *              -   in: path
 *                  name: metricID
 *                  type: string
 *                  required: true
 *                  description: id of metric for update
 *          requestBody:
 *              required: true
 *              content:
 *                  application/x-www-form-urlencoded:
 *                      schema:
 *                          $ref: '#/components/schemas/Add-Comment-Metric'
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
 *  /main_app/garage/get_comments_ofmetric/{metricID}:
 *      get:
 *          tags: [Garage(UserPanel)]
 *          summary: get comments of a metric
 *          parameters:
 *              -   in: path
 *                  name: metricID
 *                  type: string
 *                  required: true
 *                  description: id of metric for update
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
 *  /main_app/garage/get_metrics:
 *      get:
 *          tags: [ Garage(UserPanel)]
 *          summary: get all posts
 *          responses:
 *              200:
 *                  description: success - get array of posts
 */
/**
 * @swagger
 *  /main_app/garage/get_shareLink_ofmetric/{metricID}:
 *      get:
 *          tags: [Garage(UserPanel)]
 *          summary: get shareLink of a metric
 *          parameters:
 *              -   in: path
 *                  name: metricID
 *                  type: string
 *                  required: true
 *                  description: id of metric for update
 *          responses:
 *              200:
 *                  description: success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              $ref: '#/definitions/publicDefinition'
 */