require("dotenv").config();
const express = require("express");
const axios = require("axios");
const OAuth = require("oauth-1.0a");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("public"));

const oauth = OAuth({
  consumer: {
    key: process.env.DISCOGS_KEY,
    secret: process.env.DISCOGS_SECRET,
  },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return crypto
      .createHmac("sha1", key)
      .update(base_string)
      .digest("base64");
  },
});

app.get("/wantlist", async (req, res) => {
  try {
    let page = 1;
    let allWants = [];
    let totalPages = 1;

    //Create the entire "wantlist" by concating each page.
    while (page <= totalPages) {
      const url = `https://api.discogs.com/users/${process.env.DISCOGS_USERNAME}/wants?page=${page}&per_page=100`;

      const request_data = {
        url,
        method: "GET",
      };

      const headers = oauth.toHeader(oauth.authorize(request_data));

      const response = await axios.get(url, { headers });
      //console.log("This is the response of the call to get request data " +  response.data.pagination.pages);
      totalPages = response.data.pagination.pages;
      allWants = allWants.concat(response.data.wants);

      page++;
    }

    // Group by styles
    const grouped = {};
    const master_id_list = [];

    allWants.forEach(item => {
      const release = item.basic_information;
      const styles = release.styles || ["Unknown"];
      if(!master_id_list.includes(release.master_id)){
      master_id_list.push(release.master_id);
      const discogsUrl = `https://www.discogs.com/master/${release.master_id}`;
      
      console.log(item.basic_information);
      styles.forEach(styles => {
        if (!grouped[styles]) grouped[styles] = [];
        grouped[styles].push({
          artist:release.artists[0].name,
          title: release.title,
          year: release.year,
          url: discogsUrl

        });
      });
    }
    });

    res.json(grouped);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error fetching wantlist");
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);