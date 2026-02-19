const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.render("index", {
    title: "Pevisa - Frontend",
    apiBaseUrl: process.env.API_BASE_URL,
  });
});

app.get("/proveedores", (req, res) => {
  res.render("proveedores", {
    title: "Proveedores",
    apiBaseUrl: process.env.API_BASE_URL,
  });
});

app.get("/clientes", (req, res) => {
  res.render("clientes", {
    title: "Clientes",
    apiBaseUrl: process.env.API_BASE_URL,
  });
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Frontend running on http://localhost:${port}`);
});
