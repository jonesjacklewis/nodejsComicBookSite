const EXPRESS = require("express");
const FS = require("fs");
const PATH = require("path");
const QS = require("querystring");
const sqlite3 = require("sqlite3").verbose();
const REQUEST = require("request");
const VALIDATE_ISBN = require("isbn-validate");

let db = new sqlite3.Database("./database/jacks-comics.db", (err) => {
  if (err) {
    return console.error(err.message);
  }
});

function toTitleCase(str) {
  return str
    .split(" ")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

const APP = EXPRESS();
const PORT = 3000;
APP.set("view engine", "ejs");

APP.use(EXPRESS.static(PATH.join(__dirname, "public")));

APP.get("/", function (req, res) {
  let sql = `CREATE TABLE IF NOT EXISTS "comics" (
        "id"	INTEGER NOT NULL,
        "isbn"	TEXT NOT NULL,
        "title"	TEXT NOT NULL,
        "main_character"	TEXT,
        "year" INTEGER NOT NULL,
        "rating"	INTEGER,
        "url"	TEXT NOT NULL,
        "img"	TEXT NOT NULL,
        PRIMARY KEY("id" AUTOINCREMENT)
      );`;
  db.exec(sql);

  sql = `SELECT * FROM comics ORDER BY year;`;

  const selectIds = () => {
    return new Promise((resolve, reject) => {
      let result = [];
      db.each(
        sql,
        (err, row) => {
          if (err) {
            reject(err);
          }
          let int_rating = parseInt(row.rating);
          const STARS = `<i class="fa fa-star" aria-hidden="true"></i>`.repeat(
            int_rating
          );
          let div = `<div class='card'>
    
    <h1>${row.title}</h1>
    <h2>${row.isbn}</h2>
    <h2>${row.main_character}</h2>
    <p>${row.year}</p>
    <p>${STARS}</p>

    <a href='${row.url}' target='_blank'>View on Amazon</a>

    <img src='${row.img}' alt='Cover of ${row.title}'>
    
    </div>`;
          result.push(div);
        },
        () => {
          resolve(result);
        }
      );
    });
  };

  selectIds().then((matches) =>
    res.render("index", {
      results: matches.join("\n"),
    })
  );
});

APP.get("/addRecordManually", function (req, res) {
  res.writeHead(200, { "content-type": "text/html" });
  FS.createReadStream("views/addRecordManually.html").pipe(res);
});

APP.post("/arm", function (req, res) {
  if (req.method === "POST") {
    let body = "";

    req.on("data", function (data) {
      body += data;

      if (body.length > 1e6) req.destroy();
    });

    req.on("end", function () {
      const POST = QS.parse(body);

      const ISBN = POST.isbn.toLocaleLowerCase().trim();
      const TITLE = POST.title.trim();
      const MAIN_CHARACTER = POST.mainCharacter.trim();
      const YEAR = POST.year.toLocaleLowerCase().trim();
      const RATING = POST.rating.toLocaleLowerCase().trim();
      const URL = POST.url.trim();
      const IMG = POST.img.trim();

      if ([10, 13].includes(ISBN.length)) {
        let sql =
          `INSERT INTO comics VALUES (null, "${ISBN}","${TITLE}","${MAIN_CHARACTER}",${YEAR} ,${RATING},"${URL}","${IMG}");`.trim();

        db.exec(sql);

        res.writeHead(200, { "content-type": "text/html" });
        res.end(
          `<script>window.alert("${ISBN} inserted successfully");window.location.href='../';</script>`
        );
      } else {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(
          `<script>window.alert("${ISBN} is not a valid ISBN number");window.location.href='../';</script>`
        );
      }
    });
  }
});

APP.post("/results", function (req, res) {
  if (req.method === "POST") {
    let body = "";

    req.on("data", function (data) {
      body += data;

      if (body.length > 1e6) req.destroy();
    });

    req.on("end", function () {
      const POST = QS.parse(body);

      const CRITERIA = POST.criteria.toLocaleLowerCase();

      const WHERE = `WHERE isbn LIKE '%${CRITERIA}%' OR title LIKE '%${CRITERIA}%' OR main_character LIKE '%${CRITERIA}%' OR year LIKE '%${CRITERIA}%'`;

      const sql = `SELECT * FROM comics ${WHERE} ORDER BY year;`;

      const selectIds = () => {
        return new Promise((resolve, reject) => {
          let result = [];
          db.each(
            sql,
            (err, row) => {
              if (err) {
                reject(err);
              }
              let int_rating = parseInt(row.rating);
              const STARS =
                `<i class="fa fa-star" aria-hidden="true"></i>`.repeat(
                  int_rating
                );
              let div = `<div class='card'>
        
        <h1>${row.title}</h1>
        <h2>${row.isbn}</h2>
        <h2>${row.main_character}</h2>
        <p>${row.year}</p>
        <p>${STARS}</p>
    
        <a href='${row.url}' target='_blank'>View on Amazon</a>
    
        <img src='${row.img}' alt='Cover of ${row.title}'>
        
        </div>`;
              result.push(div);
            },
            () => {
              resolve(result);
            }
          );
        });
      };

      selectIds().then((matches) =>
        res.render("index", {
          criteria: CRITERIA,
          results: matches.join("\n"),
        })
      );
    });
  }
});

APP.listen(PORT, function (req, res) {
  console.log(`Listening on port ${PORT}`);
});
