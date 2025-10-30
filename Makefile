up:
\tdocker-compose up --build -d

down:
\tdocker-compose down

logs:
\tdocker logs -f snappy-api

seed:
\tdocker exec -it snappy-api npm run seed:prod
