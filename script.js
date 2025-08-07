import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  reload,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyChkZHqONT27CD5CkV02KZUPSKyGrPFojc",
  authDomain: "infinity-store-191c9.firebaseapp.com",
  projectId: "infinity-store-191c9",
  storageBucket: "infinity-store-191c9.appspot.com",
  messagingSenderId: "185404166630",
  appId: "1:185404166630:web:898dcdb0c6891e811b4627",
  measurementId: "G-9SWGH5N226"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

// Elementos DOM
const nombreUsuarioSpan = document.getElementById("nombre-usuario");
const cerrarSesionText = document.getElementById("cerrar-sesion-text");
const imgPerfil = document.getElementById("img-perfil");
const lista = document.querySelector('#lista-carrito tbody');
const vaciarCarritoBtn = document.getElementById('vaciar-carrito');
const carrito = document.getElementById('carrito');

// -- Funciones para Firestore --

async function guardarCarritoEnFirestore(userUid) {
  const productos = [];

  lista.querySelectorAll('tr').forEach(tr => {
    productos.push({
      id: tr.querySelector('a.borrar').getAttribute('data-id'),
      imagen: tr.querySelector('td img').src,
      titulo: tr.children[1].textContent,
      precio: tr.children[2].textContent,
      cantidad: parseInt(tr.querySelector('.cantidad').textContent)
    });
  });

  try {
    await setDoc(doc(db, "carritos", userUid), { productos });
    console.log("Carrito guardado en Firestore.");
  } catch (error) {
    console.error("Error guardando carrito en Firestore:", error);
  }
}

async function cargarCarritoDesdeFirestore(userUid) {
  try {
    const docRef = doc(db, "carritos", userUid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      lista.innerHTML = '';

      data.productos.forEach(producto => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><img src="${producto.imagen}" width="100%"></td>
          <td>${producto.titulo}</td>
          <td>${producto.precio}</td>
          <td class="cantidad">${producto.cantidad}</td>
          <td><a href="#" class="borrar" data-id="${producto.id}">x</a></td>
        `;
        lista.appendChild(row);
      });

      actualizarTotal();

    } else {
      console.log("No hay carrito guardado para este usuario.");
      lista.innerHTML = '';
      actualizarTotal();
    }
  } catch (error) {
    console.error("Error cargando carrito desde Firestore:", error);
  }
}

// -- Control de autenticación --

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await reload(user);
    const nombre = user.displayName || "Usuario";

    if (nombreUsuarioSpan) nombreUsuarioSpan.textContent = `Hola, ${nombre}!`;

    if (cerrarSesionText) {
      cerrarSesionText.style.display = "inline";
      cerrarSesionText.onclick = async () => {
        try {
          await signOut(auth);
          alert("Sesión cerrada correctamente.");
          cerrarSesionText.style.display = "none";
          if (nombreUsuarioSpan) nombreUsuarioSpan.textContent = "";
          if (imgPerfil) {
            imgPerfil.style.cursor = "pointer";
            imgPerfil.onclick = mostrarLogin;
          }
          lista.innerHTML = '';
          actualizarTotal();
        } catch (error) {
          console.error("Error al cerrar sesión:", error);
          alert("Error al cerrar sesión.");
        }
      };
    }

    if (imgPerfil) {
      imgPerfil.style.cursor = "default";
      imgPerfil.onclick = null;
    }

    await cargarCarritoDesdeFirestore(user.uid);

  } else {
    if (nombreUsuarioSpan) nombreUsuarioSpan.textContent = "";
    if (cerrarSesionText) cerrarSesionText.style.display = "none";
    if (imgPerfil) {
      imgPerfil.style.cursor = "pointer";
      imgPerfil.onclick = mostrarLogin;
    }
    lista.innerHTML = '';
    actualizarTotal();
  }
});

// -- Registro --

const registerForm = document.getElementById("register-form");

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre")?.value.trim();
  const email = document.getElementById("reg-email")?.value.trim();
  const password = document.getElementById("reg-password")?.value.trim();

  if (!nombre || !email || !password) {
    alert("Por favor completa todos los campos.");
    return;
  }

  if (password.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: nombre });
    alert("Cuenta creada: " + userCredential.user.displayName);
    cerrarRegistro();
    if (nombreUsuarioSpan) nombreUsuarioSpan.textContent = `Hola, ${nombre}!`;
  } catch (error) {
    console.error("Error registro:", error);
    alert("Error al registrarse: " + error.message);
  }
});

// -- Login --

const loginForm = document.getElementById("login-form");

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.querySelector('#loginModal input[type="email"]')?.value.trim();
  const password = document.querySelector('#loginModal input[type="password"]')?.value.trim();

  if (!email || !password) {
    alert("Completa ambos campos para iniciar sesión.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await reload(userCredential.user);
    alert("Sesión iniciada: " + userCredential.user.displayName);
    cerrarLogin();
    if (nombreUsuarioSpan) nombreUsuarioSpan.textContent = `Hola, ${userCredential.user.displayName}!`;
  } catch (error) {
    alert("Error al iniciar sesión: " + error.message);
  }
});

// -- Carrito --

// Asigna ID a botones de agregar carrito al cargar
window.onload = function () {
  const productos = document.querySelectorAll('.product');
  productos.forEach((producto, index) => {
    const btn = producto.querySelector('.agregar-carrito');
    if (btn) btn.setAttribute('data-id', index + 1);
  });
};

// Delegación global para clicks en "agregar-carrito"
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('agregar-carrito')) {
    e.preventDefault();
    const producto = e.target.closest('.product');
    if (producto) {
      const infoElemento = leerDatosElemento(producto);
      insertarCarrito(infoElemento);
    }
  }
});

// Delegación global para clicks en "borrar" del carrito
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('borrar')) {
    e.preventDefault();
    e.target.parentElement.parentElement.remove();
    actualizarTotal();

    const user = auth.currentUser;
    if (user) {
      guardarCarritoEnFirestore(user.uid);
    }
  }
});

// Vaciar carrito botón
vaciarCarritoBtn?.addEventListener('click', function(e) {
  e.preventDefault();
  while (lista.firstChild) lista.removeChild(lista.firstChild);
  actualizarTotal();

  const user = auth.currentUser;
  if (user) {
    guardarCarritoEnFirestore(user.uid);
  }
  return false;
});

function leerDatosElemento(elemento) {
  return {
    imagen: elemento.querySelector('img').src,
    titulo: elemento.querySelector('h3').textContent,
    precio: elemento.querySelector('.precio').textContent,
    id: elemento.querySelector('a.agregar-carrito').getAttribute('data-id'),
    cantidad: 1
  };
}

function insertarCarrito(elemento) {
  const productosEnCarrito = lista.querySelectorAll('tr');
  let encontrado = false;

  productosEnCarrito.forEach(row => {
    const rowId = row.querySelector('a.borrar').getAttribute('data-id');
    if (rowId === elemento.id) {
      encontrado = true;
    }
  });

  if (!encontrado) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${elemento.imagen}" width="100%"></td>
      <td>${elemento.titulo}</td>
      <td>${elemento.precio}</td>
      <td class="cantidad">${elemento.cantidad}</td>
      <td><a href="#" class="borrar" data-id="${elemento.id}">x</a></td>
    `;
    lista.appendChild(row);
  }

  actualizarTotal();

  const user = auth.currentUser;
  if (user) {
    guardarCarritoEnFirestore(user.uid);
  }

  const submenu = document.querySelector('.submenu');
  if (submenu) {
    submenu.classList.add('activo');
    setTimeout(() => submenu.classList.remove('activo'), 5000);
  }

  const tituloOriginal = document.title;
  document.title = 'Producto agregado al carrito 🛒';
  setTimeout(() => document.title = tituloOriginal, 5000);
}

// -- Modales --

function mostrarLogin() {
  document.getElementById("loginModal").style.display = "block";
  document.getElementById("registerModal").style.display = "none";
}
function mostrarRegistro() {
  document.getElementById("registerModal").style.display = "block";
  document.getElementById("loginModal").style.display = "none";
}
function cerrarLogin() {
  document.getElementById("loginModal").style.display = "none";
}
function cerrarRegistro() {
  document.getElementById("registerModal").style.display = "none";
}

// -- Submenú perfil --

const menuPerfil = document.getElementById("perfil-menu");

imgPerfil?.addEventListener("click", () => {
  if (menuPerfil) {
    if (menuPerfil.style.display === "block") {
      menuPerfil.style.display = "none";
      if (window.ocultarSubmenuTimeout) clearTimeout(window.ocultarSubmenuTimeout);
    } else {
      menuPerfil.style.display = "block";
      if (window.ocultarSubmenuTimeout) clearTimeout(window.ocultarSubmenuTimeout);
      window.ocultarSubmenuTimeout = setTimeout(() => {
        menuPerfil.style.display = "none";
      }, 5000);
    }
  }
});

document.addEventListener("click", (e) => {
  if (!menuPerfil.contains(e.target) && !imgPerfil.contains(e.target)) {
    menuPerfil.style.display = "none";
    if (window.ocultarSubmenuTimeout) clearTimeout(window.ocultarSubmenuTimeout);
  }
});

// --- Función para actualizar el total ---
function actualizarTotal() {
  let total = 0;

  lista.querySelectorAll('tr').forEach(tr => {
    const precioText = tr.children[2].textContent.trim();
    const precio = parseFloat(precioText.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    const cantidad = parseInt(tr.querySelector('.cantidad').textContent) || 0;

    total += precio * cantidad;
  });

  const totalFormateado = total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  const totalAmount = document.querySelector('.total-amount strong');
  if (totalAmount) {
    totalAmount.textContent = `${totalFormateado} dlls`;
  }
}

// --- Submit del formulario para guardar el pedido con la dirección y carrito real ---
document.getElementById('checkout-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const direccion = document.getElementById('direccion').value.trim();

  const carritoProductos = [];
  lista.querySelectorAll('tr').forEach(tr => {
    carritoProductos.push({
      titulo: tr.children[1].textContent,
      cantidad: parseInt(tr.querySelector('.cantidad').textContent),
      precio: parseFloat(tr.children[2].textContent.replace(/[^0-9.]/g, '')),
      imagen: tr.querySelector('td img').src
    });
  });

  if(carritoProductos.length === 0) {
    alert("El carrito está vacío, agrega productos antes de pagar.");
    return;
  }

  const total = carritoProductos.reduce((acc, p) => acc + (p.cantidad * p.precio), 0);

  try {
    await addDoc(collection(db, "compras"), {
      nombre: name,
      email: email,
      telefono: phone,
      direccionEntrega: direccion,
      productos: carritoProductos,
      total: `$${total.toFixed(2)}`,
      fecha: serverTimestamp()
    });

    alert('Gracias por tu compra. Pronto recibirás información para el pago.');

    // Limpiar formulario
    document.getElementById('checkout-form').reset();

    // Vaciar carrito en pantalla
    vaciarCarrito();

  } catch(error) {
    alert('Error guardando el pedido: ' + error.message);
  }
});
