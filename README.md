# Graphql

#### Project Objectives

The objective of this project is to learn the GraphQL query language, by creating your own profile page.

You'll use the GraphQL endpoint which is provided by the platform (https://learn.reboot01.com/api/graphql-engine/v1/graphql). You'll be able to query your own data to populate your profile page.

So that you can access your data, you'll need to create a login page.

Your profile must display three pieces of information which you may choose. For example:

    Basic user identification
    XP amount
    grades
    audits
    skills

Beside those sections it will have a mandatory section for the generation of statistic graphs.

Here are some possible combinations for the creation of the graphs:

    XP earned in a time period (progress over time)
    XP earned by project
    Audit ratio
    Projects PASS and FAIL ratio
    Piscine (JS/Go) stats
        PASS and FAIL ratio
        Attempts for each exercise

#### Login Page

You'll need a JWT to access the GraphQL API. A JWT can be obtained from the signin endpoint (https://learn.reboot01.com/api/auth/signin).

You may make a POST request to the signin endpoint, and supply your credentials using Basic authentication, with base64 encoding.

Your login page must function with both:

    username:password
    email:password

If the credentials are invalid, an appropriate error message must be displayed.

You must provide a method to log out.

When making GraphQL queries, you'll supply the JWT using Bearer authentication. It will only allow access to the data belonging to the authenticated user.

#### Hosting

Besides the creation of your own profile you will have to host it. There are several places where you can host your profile, for example: github-pages, netlify and so on. You are free to choose the hosting place.

- This project of Graphql Student Profile is hosted on github-pages.

#### Logic for gathering data:
- Total XP:
   transaction(where:{ _and:[{type: {_eq: "xp"}},
          {object:{parents:{parent:{name:{_eq:"Module"}}}}},
          ]}) {
               id
               amount
               createdAt
               path
        }

- Total Grades:
    progress(where: {
                _and: [
                    {isDone: {_eq: true}},
                    {grade: {_neq: 0}} #{grade: {_is_null: false}}
                ]
            }) {
                id
                grade
                createdAt
                path
                objectId
            }

- Audits Done/Received:
    down_transactions: transaction(
            distinct_on: [path]
            where: {type: {_eq: "down"}}
        ) {
            id
            type
            amount
            object:
            objectId
            path
        }
        up_transactions: transaction(
            where: {type: {_eq: "up"}}
        ) {
            id
            type
            amount
            object:
            objectId
            path
        }

- Audits Ratio:
    user {
                id
                login
                attrs
                auditRatio
                createdAt
            }
        
## Authors

- Tawfiq alzaidani 



### How to Run Graphql App from Github:

## you can run it locally on your pc :

- type in the terminal : npx http-server -p 5000

## you can visit the hosted website :

- Fire up a browser and go to https://the-tifo.github.io/Graphql
- Login with your Email or Username and password of your Reboot01 platform
