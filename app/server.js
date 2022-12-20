const http = require('http');
const finalHandler = require('finalhandler');
//querystring module provides utilities for parsing and formatting URL query strings.
const queryString = require('querystring');
const url = require('url');
const Router = require('router');
const bodyParser = require('body-parser');
const fs = require('fs');
//npm install lodash
const _ = require('lodash');

// State holding variables
let goals = [];
let user = {};
let users = [];
let categories = [];

// Setup router
let myRouter = Router();
myRouter.use(bodyParser.json());

// This function is a bit simpler...
http
.createServer(function (request, response) {
  myRouter(request, response, finalHandler(request, response))
})
.listen(3001, () => {
  if(err) throw err;
  // Load dummy data into server memory for serving
  goals = JSON.parse(fs.readFileSync("goals.json","utf-8"));
  
  // Load all users into users array and for now hardcode the first user to be "logged in"
  users = JSON.parse(fs.readFileSync("users.json","utf-8"));
  user = users[0];
  
  // Load all categories from file
  categories = JSON.parse(fs.readFileSync("categories.json","utf-8"));
});

const saveCurrentUser = (currentUser) => {
  //set hardcoded "logged in" user
  users[0] = currentUser;
  fs.writeFileSync("users.json", JSON.stringify(users),"utf-8");
}

// Notice how much cleaner these endpoint handlers are...
myRouter
.get('/v1/goals', function(request,response) {
  // Get our query params from the query string. Turns query string into an object. "?foo=bar" to {foo: bar}
  const queryParams = queryString.parse(url.parse(request.url).query)
  const {query, sort} = queryParams;

  // TODO: Do something with the query params
  if(query !== undefined){
    goalsToReturn = goals.filter(goal => goal.description.includes(query));

      if (!goalsToReturn){
        response.writeHead(404, "There aren't any goals to return");
        return response.end();
    } else {
      goalsToReturn = goals;
    }
    if (sort !== undefined){
      goalsToReturn.sort((a,b) => a[sort] - b[sort]);
    }
    response.writeHead(200, {"Content-Type": "application/json"});
    return response.end(JSON.stringify(goalsToReturn));
  }
  // Return all our current goal definitions (for now)
  return response.end(JSON.stringify(goals));
});

myRouter
.get('/v1/me', (request, response) => {
  if (!user ) {
    response.writeHead(404, "That user does not exist");
    return response.end();
  }
  response.writeHead(200, { "Content-Type": "application/json"});
  return response.end(JSON.stringify(user));
});

// See how i'm not having to build up the raw data in the body... body parser just gives me the whole thing as an object.
// See how the router automatically handled the path value and extracted the value for me to use?  How nice!
//USER ACCEPT A SPECIFIC GOAL
myRouter
.post('/v1/me/goals/:goalId/accept', function(request,response) {
  // Find goal from id in url in list of goals
  let goal = goals.find((goal)=> {
    return goal.id == request.params.goalId
  })

  if(!goal){
    response.writeHead(404, "That goal does not exist");
    return response.end();
  }

  saveCurrentUser(user);
  // Add it to our logged in user's accepted goals
  user.acceptedGoals.push(goal); 
  // No response needed other than a 200 success
  response.writeHead(200,"Goal accepted!");
  return response.end();
});

myRouter.post('/v1/me/goals/:goalId/achieve'), function(request, response) {
  // Find goal from id in url in list of goals
  let goal = goals.find((goal)=> {
    return goal.id == request.params.goalId;
  })

  if(!goal){
    response.writeHead(404, "That goal does not exist")
    return response.end();
  }
  //add it to our logged in user's accepted goals
  user.acceptedGoals.push(goal);
  saveCurrentUser(user);
  //no response needed other than a 200 success
  response.writeHead(200,"Goal achieved!");
  return response.end();
}

myRouter
.post('/v1/me/goals/:goalId/challenge/:userId', function(request,response) {
  // Find goal from id in url in list of goals
  let goal = goals.find((goal)=> {
    return goal.id == request.params.goalId
  })
  // Find the user who is being challenged in our list of users
  let challengedUser = users.find((user)=> {
    return user.id == request.params.userId
  })
  // Make sure the data being changed is valid
  if (!goal) {
    response.statusCode = 400
    return response.end("No goal with that ID found.")
  }
  // Add the goal to the challenged user
  challengedUser.challengedGoals.push(goal); 
  // No response needed other than a 200 success
  return response.end();
});

//GIFT A GIVEN GOAL
myRouter
.post("/v1/me/goals/:goalId/gift//:userId", (request, response) => {
  const {goalId, userId} = request.params;
  const goal = goals.find(goal => goal.id == goalId);
  const user = users.find(user => user.id == userId);

  //handle goal and/or user not existing
  if(!goal){
    response.writeHead(404, "That goal does not exist");
    return response.end();
  }
  if(!user) {
    response.writeHead(404, "That user does not exist");
    return response.end();
  }
  response.writeHead(200,"Goal gifted");
  user.giftedGoals.push(goal);
  saveCurrentUser(user);
  response.end();
});

//GET ALL CATEGORIES
myRouter.get("/v1/categories", (request, response) => {
  const parsedUrl = url.parse(request.originalUrl);
  const { query, sort } = queryString.parse(parsedUrl.query);
  let categoriesToReturn = [];
  if (query !== undefined) {
    categoriesToReturn = categories.filter(category =>
      category.name.includes(query)
    );

    if (!categoriesToReturn) {
      response.writeHead(404, "There aren't any goals to return");
      return response.end();
    }
  } else {
    categoriesToReturn = categories;
  }
  if (sort !== undefined) {
    categoriesToReturn.sort((a, b) => a[sort] - b[sort]);
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  return response.end(JSON.stringify(categoriesToReturn));
});

//GET ALL GOALS IN CATEGORY
myRouter.get("/v1/categories/:categoryId/goals", (request, response) => {
  const { categoryId } = request.params;
  const category = categories.find(category => category.id == categoryId);
  if (!category) {
    response.writeHead(404, "That category does not exist");
    return response.end();
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  const relatedGoals = goals.filter(
    goals => goals.categoryId === categoryId
  );

  console.log(relatedGoals)
  return response.end(JSON.stringify(relatedGoals));
});

module.exports = server;