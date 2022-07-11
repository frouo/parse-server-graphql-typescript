require("dotenv").config();
import express from "express";
const { default: ParseServer, ParseGraphQLServer } = require("parse-server");
var ParseDashboard = require("parse-dashboard");

const appName = process.env.PARSE_SERVER_APP_NAME || "";

console.log(
  "\x1b[40m", // black
  "\x1b[33m", // yellow
  "\n" +
    [
      `App Name: ${appName}`,
      `Database URI: ${process.env.PARSE_SERVER_DATABASE_URI}`,
      `Dashboard URL: ${process.env.PARSE_SERVER_URL}/dashboard`,
      `Health: ${process.env.PARSE_SERVER_URL}/health`,
    ].join("\n"),
  "\x1b[0m" // reset colors
);

/**
 * *************
 * PARSE SERVER
 * *************
 */

// @ts-ignore
var api = new ParseServer({
  databaseURI: process.env.PARSE_SERVER_DATABASE_URI,
  cloud: "./cloud/main.ts",
  appId: process.env.PARSE_SERVER_APP_ID,
  masterKey: process.env.PARSE_SERVER_MASTER_KEY,
  appName,
  serverURL: process.env.PARSE_SERVER_URL,
  publicServerURL: process.env.PARSE_SERVER_URL,
  allowClientClassCreation: false,
  verifyUserEmails: true,
  emailAdapter: {
    module: "parse-server-mailjet-adapter",
    options: {
      apiKey: process.env.MAILJET_PUBLIC_KEY,
      apiSecret: process.env.MAILJET_SECRET_KEY,
      fromEmail: process.env.MAILJET_FROM_EMAIL,
      fromName: process.env.MAILJET_FROM_NAME,
      // Parameters for the reset password emails
      passwordResetSubject: "Reset your password",
      passwordResetTextPart:
        "We heard that you lost your password.\n\nDon't worry! You can use the following link to reset your password:\n\n{{var:link}}\n\nCheers",
      // Parameters for the email verification emails
      verificationEmailSubject: "Please confirm your email",
      verificationEmailTextPart:
        "Thank you for registering!\n\nPlease confirm your email address by clicking the link below:\n\n{{var:link}}\n\nCheers",
    },
  },
});

/**
 * **************
 * PARSE GRAPHQL
 * **************
 */

// Create the GraphQL Server Instance
const parseGraphQLServer = new ParseGraphQLServer(api, {
  graphQLPath: "/graphql",
});

/**
 * ****************
 * PARSE DASHBOARD
 * ****************
 */

// @ts-ignore
var dashboard = new ParseDashboard(
  {
    apps: [
      {
        appName,
        appNameForURL: process.env.PARSE_SERVER_APP_ID,
        appId: process.env.PARSE_SERVER_APP_ID,
        masterKey: process.env.PARSE_SERVER_MASTER_KEY,
        serverURL: process.env.PARSE_SERVER_URL,
        graphQLServerURL: `${process.env.PARSE_SERVER_URL}/graphql`,
        primaryBackgroundColor:
          process.env.NODE_ENV === "development" ? undefined : "#f00",
        production: process.env.NODE_ENV === "production",
      },
    ],
    users: process.env.NODE_ENV === "production" && [
      {
        user: process.env.PARSE_DASHBOARD_ADMIN_USER,
        pass: process.env.PARSE_DASHBOARD_ADMIN_PASSWORD,
      },
    ],
    trustProxy: 1,
    useEncryptedPasswords: false,
  },
  { allowInsecureHTTP: false }
);

/**
 * ***********
 * EXPRESS JS
 * ***********
 */

const app = express();

// Order is important
// app.use("/functions", (req, _, next) => {
//   if (!req.headers["x-parse-application-id"]) {
//     req.headers["x-parse-application-id"] = process.env.PARSE_SERVER_APP_ID;
//   }
//   next();
// }); // 1. make "x-parse-application-id" optional
app.use("/dashboard", dashboard); // 2
app.use("/", api.app); // 3
parseGraphQLServer.applyGraphQL(app); // 4

const port = process.env.PORT || 1337;
const httpServer = require("http").createServer(app);
httpServer.listen(port, function () {
  console.log("Parse Server running on port " + port + ".");
});
