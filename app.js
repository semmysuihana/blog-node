// IMPORT SET DATABASE
const express = require('express');
const mysql = require('mysql');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const session = require('express-session'); // Import express-session
const multer = require('multer'); // Import Multer
const flash = require('express-flash');

const app = express();
app.use(session({
    secret: '1975bee3274df4f786c4c60fe54fcfa3', // Change this to a secret key
    resave: true,
    saveUninitialized: true
}));
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.set('view engine', 'ejs');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

// Koneksi ke database hanya dilakukan satu kali di awal
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "dilesui1_seanaDB" // Ganti dengan nama database Anda
});

db.connect(function(err) {
    if (err) throw err;
});


// APP INDEX
app.get('/', (req, res) => {
 
   const latestLimit = "10";
   const queryLatest = `SELECT * FROM tb_blog ORDER BY tanggal DESC LIMIT ${latestLimit}`;
    const idUser = req.session.idUser;
    db.query(queryLatest, function(err, latest) {
        if (err) throw err;

        // Query untuk mendapatkan data blog dengan kategori dan paginasi
        const selectedCategory = req.query.kategori; // Ambil query parameter kategori
        const query = "SELECT COUNT(*) as total FROM tb_blog" +
                      (selectedCategory ? " WHERE kategori = ?" : ""); // Tambahkan kondisi WHERE jika ada kategori yang dipilih
        
        db.query(query, selectedCategory, function(err, result) {
            if (err) throw err;

            const totalItems = result[0].total;
            const itemsPerPage = 5; // Ubah sesuai dengan jumlah item per halaman yang diinginkan
            const totalPages = Math.ceil(totalItems / itemsPerPage);

            // Peroleh halaman saat ini dari query parameter atau sesuai kebutuhan
            const currentPage = parseInt(req.query.page) || 1;

            // Hitung offset untuk query SQL
            const offset = (currentPage - 1) * itemsPerPage;

            const queryData = [itemsPerPage, offset];
            if (selectedCategory) {
                queryData.unshift(selectedCategory);
            }

            const queryResults = "SELECT * FROM tb_blog" +
                                (selectedCategory ? " WHERE kategori = ?" : "") + // Tambahkan kondisi WHERE jika ada kategori yang dipilih
                                " ORDER BY tanggal DESC LIMIT ? OFFSET ?";
            
                                db.query(queryResults, queryData, function(err, results) {
                                    if (err) throw err;
                                    
                                    const getUserQuery = "SELECT * FROM tb_users WHERE id = ?";
                                    
                                    db.query(getUserQuery, [idUser], function(err, userResults) {
                                      if (err) throw err;
                                      if(idUser){
                                      const userNama = userResults[0].nama; 
                                      const typeUser = userResults[0].type; 
                                      res.render('index', { data: results, totalPages, currentPage, selectedCategory, latest, userNama, typeUser });
                                      }else{
                                        const userNama = userResults[0]; 
                                      res.render('index', { data: results, totalPages, currentPage, selectedCategory, latest, userNama });
                                      }
                                    });
                                  });
                                });
                              });
                            });
                            
                            
// APP BLOG DETAIL
app.get('/blog-detail', (req, res) => {
        const queryLatest = "SELECT * FROM tb_blog ORDER BY tanggal DESC LIMIT 10";
      
        const idUser = req.session.idUser;
        db.query(queryLatest, function(err, latest) {
            // Mendapatkan data blog detail berdasarkan ID yang diberikan melalui query parameter
            const blogId = req.query.id;
            
            const queryDetail = "SELECT * FROM tb_blog WHERE id = ?";
            db.query(queryDetail, [blogId], function(err, blogDetail) {
                if (err) throw err;
                const idPenulis = blogDetail[0].penulis;
                const queryComment = "SELECT c.id, c.id_blog, u.nama AS username,c.tanggal, c.isi FROM tb_comment c JOIN tb_users u ON c.id_user = u.id WHERE c.id_blog = ? ORDER BY c.id DESC";
                db.query(queryComment, [blogId], function(err, comments) {
                    if (err) throw err;
                    const getUserQuery = "SELECT * FROM tb_users WHERE id = ?";
                    
                    db.query(getUserQuery, [idUser], function(err, userResults) {
                        if (err) throw err;
                        const getUser = "SELECT * FROM tb_users WHERE id = ?";
                        if(idUser){
                            const userNama = userResults[0].nama; 
                            const typeUser = userResults[0].type; 
                            
                            db.query(getUser, [idPenulis], function(err, penulisBlog) {
                                if (err) throw err;
                                
                                const penulisBlogNama = penulisBlog[0].nama;
                             
                                res.render('blog-detail', { blogDetail, penulisBlogNama, latest, userNama, typeUser, blogId, idUser, comments });
                               
                            })
                        } else {
                            const userNama = userResults[0]; 
                            db.query(getUser, [idPenulis], function(err, penulisBlog) {
                                if (err) throw err;
                                
                                const penulisBlogNama = penulisBlog[0].nama;
                              
                                res.render('blog-detail', { blogDetail, latest, userNama, penulisBlogNama, blogId, idUser, comments });
                               
                            })
                        }
                    })
                }); 
            });
        });
    });
    
app.post('/blog-detail', (req, res) => {
    // Mendapatkan id_blog dari query string URL

    const idUser = req.session.idUser;

    // Check if idUser exists in the session
    if (!idUser) {
        return res.redirect('/login');
    }
    // Mendapatkan id_user dan komentar dari body permintaan POST
    const { id_blog,id_user, komentar } = req.body;
    // Query untuk menyimpan komentar ke database
 // Mendapatkan tanggal dan waktu sekarang dalam zona waktu UTC
 const tanggalUTC = new Date().toISOString();

 // Konversi tanggal dan waktu UTC ke zona waktu WIB (UTC+7)
 const tanggalWIB = new Date(tanggalUTC);
 tanggalWIB.setHours(tanggalWIB.getHours());
    const sql = 'INSERT INTO tb_comment (id_blog, id_user, isi, tanggal) VALUES (?, ?, ?, ?)';
  
    db.query(sql, [id_blog, id_user, komentar, tanggalWIB], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan saat menyimpan komentar.' });
      } else {
        res.redirect('/blog-detail?id=' + id_blog); // Redirect ke halaman detail blog setelah komentar berhasil disimpan
      }
    });
  });
  
                            
                            
                            
        
// Definisi rute
const storage = multer.memoryStorage(); // Store file data in memory
const upload = multer({ storage: storage });

// Define the upload path
const uploadPath = path.join(__dirname, 'public', 'asset');

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

app.post('/submit', upload.single('gambar'), (req, res) => {

    const judul = req.body.judul;
    const penulis = req.body.penulis;
    const kategori = req.body.kategori;
    const isi = req.body.isi;
    // const isiGantiEnter = isi.replace(/\n\s*/g, '|');

    // Check if file was uploaded
    if (!req.file) {
        res.status(400).send("No file uploaded.");
        return;
    }

    const gambarData = req.file.buffer; // Get file data from Multer
    const gambarName = req.file.originalname; // Get original file name

    // Mendapatkan tanggal dan waktu sekarang dalam zona waktu UTC
    const tanggalUTC = new Date().toISOString();

    // Konversi tanggal dan waktu UTC ke zona waktu WIB (UTC+7)
    const tanggalWIB = new Date(tanggalUTC);
    tanggalWIB.setHours(tanggalWIB.getHours());

    const insertQuery = "INSERT INTO tb_blog (judul, penulis, kategori, isi, tanggal) VALUES (?, ?, ?, ?, ?)";
    const values = [judul, penulis, kategori, isi, tanggalWIB]; // Using relative path to the image

    db.query(insertQuery, values, function(err, result) {
        if (err) throw err;

        // Get the ID of the inserted row
        const insertedId = result.insertId;

        // Generate the new filename using the inserted ID and the original file extension
        const newFilename = `${insertedId}${path.extname(gambarName)}`;

        // Save the uploaded file with the new filename in the 'public/asset' folder
        const gambarPath = path.join(uploadPath, newFilename);
        fs.writeFileSync(gambarPath, gambarData);

        // Redirect back to the form page
        res.redirect('/dashboard');
    });
});

app.get('/logout', (req, res) => {
    // Lakukan proses logout di sini
    req.session.destroy(err => {
      if (err) {
        console.error('Gagal logout:', err);
      } else {
        res.redirect('/'); // Redirect pengguna ke halaman utama setelah logout
      }
    });
  });
  



// Rute untuk halaman input
app.get('/input', (req, res) => {
    const idUser = req.session.idUser;

    // Check if idUser exists in the session
    if (!idUser) {
        return res.redirect('/login');
    }
    const query = "SELECT * FROM tb_users WHERE id = ?";
    db.query(query, [idUser], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
            return;
        }
        const getUserQuery = "SELECT * FROM tb_users WHERE id = ?";
        db.query(getUserQuery, [idUser], function(err, userResults) {
          if (err) throw err;
          if(idUser){
            const userNama = userResults[0].nama; 
            const typeUser = userResults[0].type; 
        res.render('input', { userNama,typeUser, data: results });
          }else{
            const userNama = userResults[0]; 
            
        res.render('input', { userNama, data: results });
          }});
    });
    
});// Di dalam app.js

      app.get('/edit/:id', (req, res) => {
    const idUser = req.session.idUser;

    // Check if idUser exists in the session
    if (!idUser) {
        return res.redirect('/login');
    }

    // Ambil parameter ID dari URL
    const blogId = req.params.id;

    // Query database untuk mendapatkan data blog yang akan diedit
    const query = "SELECT * FROM tb_blog WHERE id = ?";
    db.query(query, [blogId], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
            return;
        }
        const idPenulis = result[0].penulis; 
        // Query untuk mendapatkan daftar penulis
        const penulisQuery = "SELECT * FROM tb_users WHERE id = ?";
        db.query(penulisQuery, [idPenulis],(penulisErr, penulisResults) => {
            if (penulisErr) {
                console.error(penulisErr);
                res.status(500).send("Internal Server Error");
                return;
            }
            const getUserQuery = "SELECT * FROM tb_users WHERE id = ?";
            db.query(getUserQuery, [idUser], function(err, userResults) {
              if (err) throw err;
              if(idUser){
                const userNama = userResults[0].nama; 
                const typeUser = userResults[0].type; 
                res.render('edit', { typeUser,userNama, blogData: result[0], penulisList: penulisResults });
              }else{
                const userNama = userResults[0]; 
                
                res.render('edit', { userNama, blogData: result[0], penulisList: penulisResults });
              }});
            // Render halaman edit dengan data blog yang akan diedit dan daftar penulis
            
        });
    });
});
app.post('/edit/:id', upload.single('gambarBaru'), (req, res) => {
    const idUser = req.session.idUser;

    // Check if idUser exists in the session
    if (!idUser) {
        return res.redirect('/login');
    }

    // Ambil parameter ID dari URL
    const blogId = req.params.id;

    // Ambil data yang dikirimkan dari formulir di halaman edit
    const judulBaru = req.body.judul;
    const kategoriBaru = req.body.kategori;
    const penulisBaru = req.body.penulis;
    const isiBaru = req.body.isi;
    const gambarBaruData = req.file ? req.file.buffer : null; // Get file data from Multer

    // Query database untuk mendapatkan data blog yang akan diedit
    const query = "SELECT * FROM tb_blog WHERE id = ?";
    db.query(query, [blogId], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
            return;
        }

        // Get the original filename of the existing image
        const gambarLama = result[0].gambar;

        // Jika ada gambar baru yang diunggah, kita akan menggantinya
        if (gambarBaruData) {
            // Generate the new filename using the blog ID and the original file extension
            const newFilename = `${blogId}${path.extname(req.file.originalname)}`;

            // Save the uploaded file with the new filename in the 'public/asset' folder
            const gambarPath = path.join(uploadPath, newFilename);
            fs.writeFileSync(gambarPath, gambarBaruData);
        }
            // Update query to include the new filename
            const updateQueryWithoutImage = "UPDATE tb_blog SET judul = ?, kategori = ?, penulis = ?, isi = ? WHERE id = ?";
            const valuesWithoutImage = [judulBaru, kategoriBaru, penulisBaru, isiBaru, blogId];
            
            db.query(updateQueryWithoutImage, valuesWithoutImage, (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send("Internal Server Error");
                    return;
                }
            
                res.redirect(`/table-blog`);
            });
            
        
    });
});

app.get('/delete/:id', (req, res) => {
    const idUser = req.session.idUser;

    // Check if idUser exists in the session
    if (!idUser) {
        return res.redirect('/login');
    }

    // Ambil parameter ID dari URL
    const blogId = req.params.id;

    // Hapus file gambar dari folder 'public/asset'
    const gambarPath = path.join(uploadPath, `${blogId}.jpg`);
    fs.unlink(gambarPath, (unlinkErr) => {
        if (unlinkErr) {
            console.error(unlinkErr);
        }
        // Setelah file gambar dihapus dari folder, lanjutkan dengan menghapus data dari database
        const deleteQuery = "DELETE FROM tb_blog WHERE id = ?";
        db.query(deleteQuery, [blogId], (deleteErr, deleteResult) => {
            if (deleteErr) {
                console.error(deleteErr);
                res.status(500).send("Internal Server Error");
                return;
            }
            // Redirect kembali ke halaman tabel blog setelah penghapusan berhasil
            res.redirect('/table-blog');
        });
    });
});
app.get('/delete-user/:id', (req, res) => {
    const idUser = req.session.idUser;

    // Check if idUser exists in the session
    if (!idUser) {
        return res.redirect('/login');
    }

    // Ambil parameter ID dari URL
    const userId = req.params.id;


        const deleteQuery = "DELETE FROM tb_users WHERE id = ?";
        db.query(deleteQuery, [userId], (deleteErr, deleteResult) => {
            if (deleteErr) {
                console.error(deleteErr);
                res.status(500).send("Internal Server Error");
                return;
            }
            // Redirect kembali ke halaman tabel blog setelah penghapusan berhasil
            res.redirect('/table-users');
        });
    });
app.post('/profil', (req, res) => {
    const { name, email, username, passwordLama, passwordBaru } = req.body;
    const idUser = req.session.idUser;
  
    // Melakukan pengecekan kata sandi lama dalam database
    const query = 'SELECT password FROM tb_users WHERE id = ?';
    db.query(query, [idUser], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Terjadi kesalahan saat mengambil data pengguna.');
      }
  
      if (results.length === 0) {
        return res.status(400).send('Pengguna tidak ditemukan.');
      }
  
      const storedPassword = results[0].password;
      const crypto = require('crypto');
      const hashedPasswordLama = crypto.createHash('md5').update(passwordLama).digest('hex');
    
      // Bandingkan kata sandi yang dimasukkan dengan kata sandi yang ada di database
      if (hashedPasswordLama !== storedPassword) {
        return res.status(401).send('Kata sandi lama salah.'),console.log(passwordLama+storedPassword);
        
      }
  
      // Kata sandi lama benar, lanjutkan dengan mengupdate profil atau kata sandi baru
      // Di sini Anda dapat mengubah data profil sesuai kebutuhan Anda.
  
      // Contoh penggunaan bcrypt untuk menyimpan kata sandi baru:
      const newPasswordHash = crypto.createHash('md5').update(passwordBaru).digest('hex');
      // Update data pengguna (misalnya, nama, email, username) jika diperlukan
      const updateQuery = 'UPDATE tb_users SET nama = ?, email = ?, username = ?, password = ? WHERE id = ?';
      db.query(updateQuery, [name, email, username, newPasswordHash, idUser], (err, updateResults) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Terjadi kesalahan saat mengupdate profil pengguna.');
        }
        
        return res.status(200).send('Profil berhasil diperbarui.');
      });
    });
  });
  
  

  app.get('/daftar', (req, res) => {


    res.render('daftar'); // Kirim pesan flash ke halaman login
});

const crypto = require('crypto'); // Import the crypto module
app.get('/login', (req, res) => {
    // Ambil pesan flash jika ada
    let message = false;
    res.render('login', { message }); // Kirim pesan flash ke halaman login
});


// Handle login form submission
// Handle login form submission
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // Hash the provided password using MD5
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

    // Query the database to check username and hashed password
    const query = "SELECT * FROM tb_users WHERE username = ? AND password = ?";
    db.query(query, [username, hashedPassword], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            // Pengguna berhasil login, alihkan ke halaman lain
            req.session.idUser = results[0].id;

            res.redirect('/dashboard'); // Ganti dengan rute dashboard
        } else {
            // Login gagal, kembali ke halaman login dengan pesan kesalahan
            res.render('login', { message: true });
        }
    });
});

app.get('/daftar', (req, res) => {
    res.render('daftar', { errorMessage: req.flash('error') });
});
app.get('/profil', (req, res) => {
    const idUser = req.session.idUser;

    // Check if idUser exists in the session
    if (!idUser) {
        return res.redirect('/login');
    }
        
        
        const getUserQuery = "SELECT * FROM tb_users WHERE id = ?";
        db.query(getUserQuery, [idUser], function(err, userResults) {
          if (err) throw err;
          if(idUser){
            const userNama = userResults[0].nama; 
            const userName = userResults[0].username; 
            const typeUser = userResults[0].type; 
            const emailUser = userResults[0].email; 
            res.render('profil', { userName, typeUser,userNama, emailUser });
          }else{
            const userNama = userResults[0]; 
            res.render('profil', { userNama });
          }});

});

app.post('/daftar', (req, res) => {
    const { username, password, nama, email } = req.body;
    // Hash kata sandi menggunakan MD5
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

    // Query untuk memeriksa apakah username sudah digunakan
    const checkUsernameQuery = "SELECT COUNT(*) AS count FROM tb_users WHERE username = ?";
    db.query(checkUsernameQuery, [username], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
            return;
        }

        const usernameCount = result[0].count;

        if (usernameCount > 0) {
            req.flash('error', 'Username already exists.');
            res.redirect('/daftar');
        } else {
            // Jika username belum digunakan, tambahkan pengguna ke database
            const insertUserQuery = "INSERT INTO tb_users (username, password, nama, email, type) VALUES (?, ?, ?, ?, ?)";
            const userData = [username, hashedPassword, nama, email, 'user']; // 'user' adalah nilai default untuk type

            db.query(insertUserQuery, userData, (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send("Internal Server Error");
                    return;
                }

                req.session.idUser = result.insertId;
                res.redirect('/dashboard');
            });
        }
    });
});




app.get('/table-blog', (req, res) => {
    // Retrieve idUser from the session
    const idUser = req.session.idUser;

    // Check if idUser exists in the session
    if (!idUser) {
        return res.redirect('/login');
    }

    // Query database untuk mendapatkan data dari tb_blog
    const query = "SELECT * FROM tb_blog ORDER BY tanggal DESC";
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
            return;
        }
        
        const getUserQuery = "SELECT * FROM tb_users WHERE id = ?";
        db.query(getUserQuery, [idUser], function(err, userResults) {
          if (err) throw err;
          if(idUser){
            const userNama = userResults[0].nama; 
            const typeUser = userResults[0].type; 
            if(typeUser=="admin"){
            res.render('table-blog', { typeUser,userNama, data: results });
            }else{
                const query = "SELECT * FROM tb_blog WHERE penulis = ?";
                db.query(query, [idUser], function(err, results) {
                res.render('table-blog', { typeUser,userNama, data: results });
                });
            }
          }else{
            const userNama = userResults[0]; 
            if(typeUser=="admin"){
            res.render('table-blog', { userNama, data: results });
            }else{
                const query = "SELECT * FROM tb_blog WHERE penulis = ? ORDER BY tanggal DESC";
                db.query(query, [idUser], function(err, results) {
                res.render('table-blog', { typeUser,userNama, data: results });
                });
            }
          }});
        // Render template 'table-blog' dengan data hasil query
      
    });
});


app.get('/table-users', (req, res) => {
    // Retrieve idUser from the session
    const idUser = req.session.idUser;

    // Check if idUser exists in the session
    if (!idUser) {
        return res.redirect('/login');
    }

    // Query database untuk mendapatkan data dari tb_blog
    const query = "SELECT * FROM tb_users ORDER BY id DESC";
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
            return;
        }
        const getUserQuery = "SELECT * FROM tb_users WHERE id = ?";
        db.query(getUserQuery, [idUser], function(err, userResults) {
          if (err) throw err;
          if(idUser){
            const userNama = userResults[0].nama; 
            const typeUser = userResults[0].type; 
            if (typeUser!="admin") {
                return res.redirect('/dashboard');
            }
            res.render('table-users', { typeUser,userNama, data: results });
          }else{
            const userNama = userResults[0]; 
            res.render('table-users', { userNama, data: results });
          }});
        // Render template 'table-users' dengan data hasil query
      
    });
});


app.get('/dashboard', (req, res) => {
    // Mendapatkan idUser dari sesi
    const idUser = req.session.idUser;
    
    // Pastikan idUser ada dalam sesi sebelum mengakses dashboard
    if (!idUser) {
        return res.redirect('/login'); // Jika tidak ada, arahkan pengguna ke halaman login
    }
    
    const countBlogQuery = "SELECT COUNT(*) AS blogCount FROM tb_blog";
    
    // Execute a SQL query to count the rows in the tb_users table
    const countUserQuery = "SELECT COUNT(*) AS userCount FROM tb_users";

    db.query(countBlogQuery, (errBlog, resultBlog) => {
        if (errBlog) {
            console.error(errBlog);
            res.status(500).send("Internal Server Error");
            return;
        }

        const blogCount = resultBlog[0].blogCount;

        db.query(countUserQuery, (errUser, resultUser) => {
            if (errUser) {
                console.error(errUser);
                res.status(500).send("Internal Server Error");
                return;
            }

            const userCount = resultUser[0].userCount;

            const getUserQuery = "SELECT * FROM tb_users WHERE id = ?";
                                    db.query(getUserQuery, [idUser], function(err, userResults) {
                                      if (err) throw err;
                                      if(idUser){
                                        const userNama = userResults[0].nama; 
                                        const typeUser = userResults[0].type; 
                                        res.render('dashboard', { blogCount, userCount, userNama, typeUser });
                                      }else{
                                        const userNama = userResults[0]; 
                                         res.render('dashboard', { blogCount, userCount, userNama });
                                      }});
        });
    });
});

// Configure Multer




// ...
app.get('/asset/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, 'public', 'asset', filename);
    res.sendFile(imagePath);
});
// ...


// Menjalankan server
app.listen(3000, () => {
    
});
