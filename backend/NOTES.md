


[GET]  http://localhost:3000/

Hello World

[GET] http://localhost:3000/users > Return all users (200)

[GET] http://localhost:3000/users/1 > return user with id 1 (200)

[POST] http://localhost:3000/users > return user created (201)

[DELETE] http://localhost:3000/users/:id > return status user delete (200)

[PUT] http://localhost:3000/users/:id > return status user UPDATED (200)



profile.entity.ts => ID - CREATED_AT - UPDATE_AT - NOMBRE - APELLIDO - AVATAR

user.entity.ts => Solo ID y PASSWORD

# For production

npm run buid
npm run typeorm migration:run
npm run start:prod
