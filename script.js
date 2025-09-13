// ===================== FIREBASE CONFIG =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
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

// Activar persistencia local
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error con persistencia de sesión:", error);
});

// ===================== ELEMENTOS DOM =====================
const nombreUsuarioSpan = document.getElementById("nombre-usuario");
const cerrarSesionText = document.getElementById("cerrar-sesion-text");
const imgPerfil = document.getElementById("img-perfil");
const lista = document.querySelector('#lista-carrito tbody');
const vaciarCarritoBtn = document.getElementById('vaciar-carrito');
const carrito = document.getElementById('carrito');
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

// ===================== MODALES =====================
window.mostrarLogin = function() {
  document.getElementById("loginModal").style.display = "block";
  document.getElementById("registerModal").style.display = "none";
};
window.mostrarRegistro = function() {
  document.getElementById("registerModal").style.display = "block";
  document.getElementById("loginModal").style.display = "none";
};
window.cerrarLogin = function() {
  document.getElementById("loginModal").style.display = "none";
};
window.cerrarRegistro = function() {
  document.getElementById("registerModal").style.display = "none";
};
window.onclick = function(event) {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none";
  }
};

// ===================== AUTENTICACIÓN =====================
loginForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Inicio de sesión exitoso: " + userCredential.user.email);
      cerrarLogin();
      nombreUsuarioSpan.textContent = userCredential.user.displayName || email;
      cargarCarritoDesdeFirestore(userCredential.user.uid).then(() => {
        guardarCarritoEnLocalStorage();
      });
    })
    .catch((error) => {
      alert("Error al iniciar sesión: " + error.message);
    });
});

registerForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const nombre = document.getElementById("nombre").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      updateProfile(userCredential.user, { displayName: nombre });
      alert("Cuenta creada: " + userCredential.user.email);
      cerrarRegistro();
      nombreUsuarioSpan.textContent = nombre;
    })
    .catch((error) => {
      alert("Error al registrarse: " + error.message);
    });
});

// Cerrar sesión
cerrarSesionText.addEventListener("click", () => {
  signOut(auth).then(() => {
    nombreUsuarioSpan.textContent = "";
    alert("Sesión cerrada");
  });
});

// Mantener sesión iniciada
onAuthStateChanged(auth, (user) => {
  if (user) {
    nombreUsuarioSpan.textContent = user.displayName || user.email;
    cargarCarritoDesdeFirestore(user.uid).then(() => {
      guardarCarritoEnLocalStorage();
    });
  }
});

// Mantener sesión iniciada y mostrar elementos según estado
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuario ha iniciado sesión
    nombreUsuarioSpan.textContent = user.displayName || user.email;
    cerrarSesionText.style.display = "inline-block"; // Mostrar botón cerrar sesión
    loginForm.style.display = "none"; // Ocultar login si está visible
    registerForm.style.display = "none"; // Ocultar registro si está visible
    cargarCarritoDesdeFirestore(user.uid).then(() => {
      guardarCarritoEnLocalStorage();
    });
  } else {
    // Usuario ha cerrado sesión
    nombreUsuarioSpan.textContent = "";
    cerrarSesionText.style.display = "none"; // Ocultar botón cerrar sesión
  }
});

// Cerrar sesión
cerrarSesionText.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      nombreUsuarioSpan.textContent = "";
      alert("Sesión cerrada");
    })
    .catch((error) => {
      console.error("Error al cerrar sesión:", error);
      alert("No se pudo cerrar sesión: " + error.message);
    });
});

// ===================== CARRITO DE COMPRAS =====================
const productos = document.querySelectorAll('.product');
productos.forEach((producto, index) => {
  const btn = producto.querySelector('.agregar-carrito');
  if (btn) btn.setAttribute('data-id', index + 1);
});

document.querySelector('.product-content')?.addEventListener('click', comprarElemento);
carrito?.addEventListener('click', eliminarElemento);
vaciarCarritoBtn?.addEventListener('click', vaciarCarrito);

function comprarElemento(e) {
  e.preventDefault();
  if (e.target.classList.contains('agregar-carrito')) {
    const elemento = e.target.closest('.product');
    leerDatosElemento(elemento, e.target);
    mostrarSubmenuCarrito();
    guardarCarritoEnLocalStorage(); // Guardar siempre al agregar
    guardarCarritoActual(); // Guardar en Firestore si hay sesión
  }
}

function leerDatosElemento(elemento, boton) {
  // Convertir precio a número, eliminando todo lo que no sea dígito o punto
  const precioNum = parseFloat(elemento.querySelector('.precio').textContent.replace(/[^0-9.]/g, ''));
  
  const infoElemento = {
    imagen: elemento.querySelector('img').src,
    titulo: elemento.querySelector('h3').textContent,
    precio: isNaN(precioNum) ? 0 : precioNum, // Si no es número, poner 0
    id: boton.getAttribute('data-id'),
    cantidad: 1
  };
  insertarCarrito(infoElemento);
}


function insertarCarrito(elemento) {
  const productosEnCarrito = lista.querySelectorAll('tr');
  let encontrado = false;

  productosEnCarrito.forEach(row => {
    const rowId = row.querySelector('a.borrar').getAttribute('data-id');
    if (rowId === elemento.id) {
      const cantidadTd = row.querySelector('.cantidad');
      cantidadTd.textContent = parseInt(cantidadTd.textContent) + 1;
      encontrado = true;
    }
  });

  if (!encontrado) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${elemento.imagen}" width="60px" alt="${elemento.titulo}"></td>
      <td>${elemento.titulo}</td>
      <td>$${(Number(elemento.precio) || 0).toFixed(2)}</td>

      <td class="cantidad">${elemento.cantidad}</td>
      <td><a href="#" class="borrar" data-id="${elemento.id}">x</a></td>
    `;
    lista.appendChild(row);
  }

  actualizarTotal();
}

function eliminarElemento(e) {
  e.preventDefault();
  if (e.target.classList.contains('borrar')) {
    e.target.closest('tr').remove();
    guardarCarritoEnLocalStorage();
    guardarCarritoActual();
    actualizarTotal();
  }
}

function vaciarCarrito(e) {
  e.preventDefault();
  while (lista.firstChild) lista.removeChild(lista.firstChild);
  guardarCarritoEnLocalStorage();
  guardarCarritoActual();
  actualizarTotal();
}

function actualizarTotal() {
  const totalAmount = document.querySelector('.total-amount strong');
  let total = 0;
  lista.querySelectorAll('tr').forEach(tr => {
    const cantidad = parseInt(tr.querySelector('.cantidad').textContent);
    const precio = parseFloat(tr.children[2].textContent.replace('$', ''));
    total += cantidad * precio;
  });
  if(totalAmount) totalAmount.textContent = `$${total.toFixed(2)}`;
}

// Mostrar submenu carrito temporal
function mostrarSubmenuCarrito() {
  const submenu = document.querySelector('.submenu');
  if(submenu){
    submenu.classList.add('mostrar-carrito');
    setTimeout(() => submenu.classList.remove('mostrar-carrito'), 3000);
  }
}

// ===================== FIRESTORE =====================
async function guardarCarritoEnFirestore(userUid) {
  const productosArray = [];
  lista.querySelectorAll('tr').forEach(tr => {
    productosArray.push({
      id: tr.querySelector('a.borrar').getAttribute('data-id'),
      imagen: tr.querySelector('td img').src,
      titulo: tr.children[1].textContent,
      precio: parseFloat(tr.children[2].textContent.replace(/[^0-9.]/g, '')) || 0,

      cantidad: parseInt(tr.querySelector('.cantidad').textContent)
    });
  });

  try {
    await setDoc(doc(db, "carritos", userUid), { productos: productosArray });
    console.log("Carrito guardado en Firestore");
  } catch (error) {
    console.error("Error guardando carrito:", error);
  }
}

async function cargarCarritoDesdeFirestore(userUid) {
  try {
    const docRef = doc(db, "carritos", userUid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      lista.innerHTML = "";
      docSnap.data().productos.forEach(elemento => {
        insertarCarrito(elemento);
      });
      actualizarTotal();
    }
  } catch (error) {
    console.error("Error cargando carrito:", error);
  }
}

function guardarCarritoActual() {
  const user = auth.currentUser;
  if (user) guardarCarritoEnFirestore(user.uid);
}z

// ===================== LOCALSTORAGE PARA PERSISTENCIA =====================
document.addEventListener('DOMContentLoaded', () => {
  const carritoLocal = JSON.parse(localStorage.getItem('carrito')) || [];
  carritoLocal.forEach(el => insertarCarrito(el));
});

function guardarCarritoEnLocalStorage() {
  const productosArray = [];
  lista.querySelectorAll('tr').forEach(tr => {
    productosArray.push({
      id: tr.querySelector('a.borrar').getAttribute('data-id'),
      imagen: tr.querySelector('td img').src,
      titulo: tr.children[1].textContent,
      precio: parseFloat(tr.children[2].textContent.replace(/[^0-9.]/g, '')) || 0,

      cantidad: parseInt(tr.querySelector('.cantidad').textContent)
    });
  });
  localStorage.setItem('carrito', JSON.stringify(productosArray));
}

// ===================== MENÚ HAMBURGUESA =====================
const menuIcon = document.getElementById('menuToggle');
const menuDesplegable = document.getElementById('menuDesplegable');
let timeoutId;

function mostrarMenu() {
  menuDesplegable.style.display = 'block';
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    menuDesplegable.style.display = 'none';
  }, 5000);
}

menuIcon.addEventListener('mouseenter', mostrarMenu);
menuDesplegable.addEventListener('mouseenter', () => clearTimeout(timeoutId));
menuDesplegable.addEventListener('mouseleave', () => timeoutId = setTimeout(() => {
  menuDesplegable.style.display = 'none';
}, 5000));
