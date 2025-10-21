// index.js
import express from 'express';
// import cors from 'cors';
import supabase from './supabaseClient.js';
import EJS from 'express-ejs-layouts'
import fileUpload from 'express-fileupload'
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { injectSpeedInsights } from '@vercel/speed-insights';
import NodeCache from 'node-cache';

injectSpeedInsights();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inisialisasi Cache dengan TTL 15 menit (900 detik)
// stdTTL: Time-To-Live default untuk setiap cache item
// checkperiod: Interval untuk memeriksa dan menghapus item yang kadaluarsa (dalam detik)
const myCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });

// --- Configurable cookie options ---
// Secure must be true in production (Vercel uses HTTPS).
const cookieOptions = {
  httpOnly: true,                      // inaccessible via JS (mitigates XSS)
  secure: true, // send only over HTTPS in production
  sameSite: 'lax',                     // allow top-level navigations (login->redirect flows)
  maxAge: 1000 * 60 * 30,     // 30 minutes
  path: '/',                           // cookie path
  domain: 'blog.jiwasehat.com'         // set if you're using subdomains; omit for automatic
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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

function signToken(payload, opts = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: opts.expiresIn || '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// --- Middleware ---
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) {
    // No cookie -> not authenticated
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    // invalid or expired token
    // clear cookie to be safe
    res.clearCookie('token', cookieOptions);
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }
  // attach user info to req for handlers
  req.user = payload;
  next();
}

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));
app.use(EJS)
app.use(fileUpload())
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// GET - Ambil semua produk
app.get('/', async (req, res) => {
  const cachedData = myCache.get("articles");
  
  const isLoggedIn = req.cookies && req.cookies.token;
  
  if (cachedData) {
    return res.render("blog/blog.ejs",{
      layout: "layout",
      data: cachedData,
      isLoggedIn
    });
  }
  
  const { data, error } = await supabase
    .from('articles')
    .select('*');

  if (error) {
    console.error("error halaman utama: ", error)
    return res.render("error.ejs",{
      layout: "layout",
      data: "server error",
      isLoggedIn
    });
  }

  myCache.set("articles",data);

  console.log("data halaman utama",data)
  console.log("isLoggedIn ",isLoggedIn)
  return res.render("blog/blog.ejs",{
    layout: "layout",
    data,
    isLoggedIn
  });
});

// halaman login
app.get('/account', (req, res)=>{
  try {
    const token = req.cookies && req.cookies.token
    if (token && verifyToken(token)) {
      return res.redirect("/")
    }
    return res.render("auth/login.ejs",{
      layout: "layout"
    })
  } catch (error) {
    console.error("error halaman utama", error)
    return res.render("error",{
      layout:"layout",
      data: "server error",
    });
  }
})

app.get('/article/content/:id', async(req, res)=>{
  try {
    const id = req.params.id

    const isLoggedIn = req.cookies && req.cookies.token;

    const cachedData = myCache.get(`article_${id}`);

    if (cachedData) {
      return res.render("blog/detail-blog.ejs",{
        layout: "layout",
        article: cachedData,
        isLoggedIn
      });
    }
    
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

      if (error || !article) {
          console.error("error artikel tidak ditemukan", error,"\n\nartikel\n\n",article)
          return res.render("error.ejs",{
            layout: "layout",
            code: 400,
            message: "error"
          });
      }
    myCache.set(`article_${id}`,article);
    return res.render("blog/detail-blog.ejs",{
      layout: "layout",
      article,
      isLoggedIn
    })
  } catch (error) {
    console.error("error detail blog", error)
    return res.render("error.ejs",{
      layout:"layout",
      data: "server error",
      code: 500
    });
  }
})

app.get('/article/update/:id', requireAuth, async(req, res)=>{
  try {
    const id = req.params.id

    const isLoggedIn = req.cookies && req.cookies.token;

    const cachedData = myCache.get(`article_${id}`);

    if (cachedData) {
      return res.render("blog/update-blog.ejs",{
        layout: "layout",
        article: cachedData,
        isLoggedIn
      });
    }
    
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

      if (error || !article) {
          console.error("error edit, artikel tidak ditemukan", error,"\n\nartikel\n\n",article)
          return res.render("error.ejs",{
            layout: "layout",
            code: 400,
            message: "error"
          });
      }
    myCache.set(`article_${id}`,article);
    
    return res.render("blog/update-blog.ejs",{
      layout: "layout",
      article,
      isLoggedIn
    })
  } catch (error) {
    console.error("error edit, detail blog", error)
    return res.render("error.ejs",{
      layout:"layout",
      data: "server error",
      code: 500
    });
  }
})

// halaman post update artikel
app.post('/article/update/:id', async(req, res)=>{
  try {
    if (!req.body || !req.body.title || !req.body.description || !req.params.id) {
      console.error("error update artikel, data kosong, req.body",req.body,"\nreq.params.id",req.params.id)
      return res.render("error.ejs",{
        layout: "layout",
        code: 400,
        message: "error"
      });
    }

    const tgl = new Date();

    const opsi = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const timeArt = tgl.toLocaleDateString('id-ID', opsi);
    
    // Cari artikel berdasarkan email
    const { data: article, error } = await supabase
      .from('articles')
      .update({
        title:req.body.title,
        description:req.body.description,
        time:timeArt
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !article) {
      console.error("error update artikel", error,"\n\narticle\n\n",user)
      return res.render("error.ejs",{
        layout: "layout",
        code: 500,
        message: "error server"
      });
    }

    return res.redirect("/article/content/"+req.params.id)
  } catch (error) {
    console.error("error halaman utama", error)
    return res.render("error",{
      layout:"layout",
      data: "server error"
    });
  }
})

app.get('/article/delete/:id', requireAuth, async(req,res)=>{
  try{
    if (!req.params.id){
      console.error("error hapus artikel, req.params.id",req.params.id)
      return res.render("error.ejs",{
        layout: "layout",
        code: 400,
        message:"error"
      })
    }

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', req.params.id);

    const isLoggedIn = req.cookies && req.cookies.token

    if (error){
      console.error("error hapus artikel",error)
      return res.render("error.ejs",{
        layout: "layout",
        code: 500,
        message:"error server",
        isLoggedIn
      })
    }

    return res.redirect("/")
  } catch(error){
      console.error("error server hapus artikel",error)
      return res.render("error.ejs",{
        layout: "layout",
        code: 500,
        message:"error server"
      })
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

      // Create JWT payload minimal
  const token = signToken({
      email:req.body.email,
      password:req.body.password
    });

  // Set cookie; IMPORTANT: Set cookie before sending any other headers or body.
  res.cookie('token', token, cookieOptions);

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
app.get('/articles/new', requireAuth,(req, res)=>{
  try {
    const isLoggedIn = req.cookies && req.cookies.token;
    return res.render("blog/new-blog.ejs",{
      layout: "layout",
      isLoggedIn
    })
  } catch (error) {
    console.error("error halaman utama", error)
    return res.render("error.ejs",{
      layout:"layout",
      data: "server error",
      code:500
    });
  }
})

// halaman tambah artikel
app.post('/articles/new', requireAuth, async(req, res)=>{
  try {
    if (!req.body || !req.body.title || !req.body.description) {
      console.error("error login, data kosong, req.body",req.body)
      return res.render("error.ejs",{
        layout: "layout",
        code: 400,
        message: "error"
      });
    }

    const tgl = new Date();

    const opsi = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const timeArt = tgl.toLocaleDateString('id-ID', opsi);

    const {data, error} = await supabase.from("articles")
    .insert([{
      title:req.body.title,
      description:req.body.description,
      time:timeArt
    }]).select()

    if (error) {
      console.error("error posting artikel",error)
      return res.render("error.ejs",{
        layout:"layout",
        code: 500,
        message: "error server",
        isLoggedIn:req.session.user
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

// GET /api/logout
app.get('/logout', (req, res) => {
  // Clear cookie by setting expiry in past
  res.clearCookie('token', cookieOptions);
  return res.redirect("/");
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
