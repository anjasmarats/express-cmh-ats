// index.js
import express from 'express';
// import cors from 'cors';
import supabase from './supabaseClient.js';
import EJS from 'express-ejs-layouts'
import fileUpload from 'express-fileupload'
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import { title } from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(session({
  secret: 'your-secret-key', // Required: used to sign the session ID cookie
  resave: false,             // Recommended: avoid saving unmodified sessions
  saveUninitialized: false,  // Recommended: avoid saving empty sessions
  cookie: { 
    secure: false,           // Set to true if using HTTPS
    httpOnly: true,          // Recommended: prevents client-side JS access
    maxAge: 1000 * 60 * 30   // Optional: session duration (e.g., 30 minutes)
  }
}));
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));
app.use(EJS)
app.use(fileUpload())
app.use(express.static(path.join(__dirname, 'assets')))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cekauth = (req,res) => {
  console.log("cek auth !req.session.user",!req.session.user,"\nreq.session.user",req.session.user)
  if (!req.session.user) return res.redirect("/")
}

// GET - Ambil semua produk
app.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*');
  
  if (error) {
    console.error("error halaman utama: ", error)
    return res.render("error.ejs",{
      layout: "layout",
      data: "server error"
    });
  }

  const isLoggedIn = req.session.user

  console.log("data halaman utama",data)
  console.log("isLoggedIn ",isLoggedIn)
  res.render("blog/blog.ejs",{
    layout: "layout",
    data,
    isLoggedIn
  });
});

// halaman login
app.get('/account', (req, res)=>{
  try {
    if (req.session.user || req.session.isLoggedin) {
      return res.redirect("/")
    }
    return res.render("auth/login.ejs",{
      layout: "layout"
    })
  } catch (error) {
    console.error("error halaman utama", error)
    return res.render("error",{
      layout:"layout",
      data: "server error"
    });
  }
})

// halaman login post
app.post('/account', async(req, res)=>{
  try {
    if (!req.body || !req.body.email || !req.body.password) {
      console.error("error login, data kosong, req.body",req.body)
      return res.render("error.ejs",{
        layout: "layout",
        code: 400,
        message: "error"
      });
    }
    // Cari user berdasarkan email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', req.body.email)
      .eq('password',req.body.password)
      .single();

    if (error || !user) {
      console.error("error email/password salah", error,"\n\nuser\n\n",user)
      return res.render("error.ejs",{
        layout: "layout"
      });
    }

    req.session.user = {
      email:req.body.email,
      password:req.body.password
    }

    return res.redirect("/")
  } catch (error) {
    console.error("error halaman utama", error)
    return res.render("error",{
      layout:"layout",
      data: "server error"
    });
  }
})

// halaman tambah artikel
app.get('/articles/new', (req, res)=>{
  try {
    cekauth(req,res)
    return res.render("blog/new-blog.ejs",{
      layout: "layout"
    })
  } catch (error) {
    console.error("error halaman utama", error)
    return res.render("error",{
      layout:"layout",
      data: "server error"
    });
  }
})

// halaman tambah artikel
app.post('/articles/new', async(req, res)=>{
  try {
    cekauth(req,res)
    if (!req.body || !req.body.title || !req.body.description) {
      console.error("error login, data kosong, req.body",req.body)
      return res.render("error.ejs",{
        layout: "layout",
        code: 400,
        message: "error"
      });
    }
    const {data, error} = await supabase.from("articles")
    .insert([{
      title:req.body.title,
      description:req.body.description
    }]).select()

    if (error) {
      console.error("error posting artikel",error)
      return res.render("error.ejs",{
        layout:"layout",
        code: 500,
        message: "error server"
      })
    }

    return res.redirect("/");
  } catch (error) {
    console.error("error halaman utama", error)
    return res.render("error.ejs",{
      code: 500,
      layout:"layout",
      data: "server error"
    });
  }
})

// POST - simpan artikel baru
app.post('/articles', async (req, res) => {
  cekauth(req,res);
  const { title, description } = req.body;
  const { data, error } = await supabase
    .from('articles')
    .insert([{ title, description }])
    .select();

  if (error) {
    return res.render("error",{
      layout: "layout",
      data: "server error"
    });
  }
  return res.redirect("/articles");
});

// PUT - Perbarui produk berdasarkan ID
app.put('/articles/:id', async (req, res) => {
  cekauth(req,res);
  const { id } = req.params;
  const { title, description } = req.body;
  const { data, error } = await supabase
    .from('articles')
    .update({ title, description })
    .eq('id', id)
    .select();

  if (error) {
    return res.render("error",{
      layout: "layout",
      data: "server error"
    });
  }
  res.redirect("/");
});

// DELETE - Hapus produk berdasarkan ID
app.delete('/articles/:id', async (req, res) => {
  cekauth(req,res);
  const { id } = req.params;
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) {
    return res.render("error",{
      layout: "layout",
      data: "server error"
    });
  }
  res.status(200).json({ message: 'Product deleted successfully' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
