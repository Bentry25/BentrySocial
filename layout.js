document.addEventListener("DOMContentLoaded", function () {
  // Page has finished loading. Now, do things.
  loadLayoutByPetraPixel();

  // Add any custom JavaScript code here...
});

function loadLayoutByPetraPixel() {
  const mainEl = document.querySelector("main");
  if (!mainEl) return;
  mainEl.insertAdjacentHTML("beforebegin", headerHTML());
  mainEl.insertAdjacentHTML("afterend", footerHTML());
  giveActiveClassToCurrentPage();
}

const nesting = getNesting();

function headerHTML() {
  // ${nesting} outputs "./" or "../" depending on current page depth.
  // You can use it to refer to images etc.
  // Example: <img src="${nesting}img/logo.png"> might output <img src="../img/logo.png">

  return `
  
      <!-- =============================================== -->
      <!-- HEADER -->
      <!-- =============================================== -->

      <header>

        <div class="header-content">
	        <div class="header-title">Bentry</div>
	        
        	
        </div>
      </header>

	  
	
	  
      <!-- =============================================== -->
      <!-- RIGHT SIDEBAR -->
      <!-- =============================================== -->

      <aside class="right-sidebar">
	  <iframe width="180" height="180" style="border:none" src="https://dimden.dev/moon?custom=1" name="dimdenmoonwidget"></iframe>
                 
        
        <!-- NAVIGATION -->
        <nav>
          <div class="sidebar-title">Navigation</div>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="https://bentry.atabook.org/">Guestbook!</a></li>
        	<li>
        	
              	<details open="open">
                <summary>Hobbies!</summary>
                <ul>
                  <li><a href="https://www.bookshelf.town/user/Bentry"> What I've been reading (bookshelf.town)</a></li>
                  <li><a href="/games.html">Video Games</a></li>
                </ul>
                </details>
            </li>
          </ul>
        </nav>
        
        <div class="sidebar-section">
          <div class="sidebar-title">Currently Playing:</div>
          <p>Hollow Knight Silksong</p>
          <p>(No spoilers pls!)</p>
        </div>
        
        
        
        <div class="sidebar-section">
          <div class="sidebar-title">Friends</div>
          
          <marquee>
            <a href="https://kingdomofakibaten.neocities.org/"><img src="https://kingdomofakibaten.neocities.org/index/button-1.gif" alt=Akibaten></a>
          	<a href="https://prydt.xyz" target="_blank"><img src="" alt="prydt.xyz"></a>
            <a href="https://junelc.xyz/">junelc.xyz</a>
            <a href="https://eidna.me/">eidna.me</a> 
            <a href="https://jeongwoo.xyz/">jeongwoo.xyz</a> 
            <a href="https://benaubin.com/">benaubin.com</a> 
          </marquee>
        </div>
        
        <div class="sidebar-section">
          <div class="sidebar-title">My Button!</div>
          <div class="site-button">
          	<a href="https://bengentry.com/" target="_blank"><img src="images/BentryButton.png" alt="Bentry"></a>
        	<textarea><a href="https://test.bengentry.com/" target="_blank"><img src="images/BentryButton.png" alt="Bentry"></a></textarea>
          </div>
        </div>
      </aside>
      `;
}

function footerHTML() {
  // ${nesting} outputs "./" or "../" depending on current page depth.
  // You can use it to refer to images etc.
  // Example: <img src="${nesting}img/logo.png"> might output <img src="../img/logo.png">

  return `


      <!-- =============================================== -->
      <!-- FOOTER -->
      <!-- =============================================== -->

      <footer>
            <div>Footer Text. <a href="/">Link.</a> Template generated with <a href="https://petrapixel.neocities.org/coding/layout-generator.html">petrapixel's layout generator</a>.</div>
      </footer>`;
}

/* Do not edit anything below this line unless you know what you're doing. */

function giveActiveClassToCurrentPage() {
  const els = document.querySelectorAll("nav a");
  [...els].forEach((el) => {
    const href = el.getAttribute("href").replace(".html", "").replace("#", "");
    const pathname = window.location.pathname.replace("/public/", "");
    const currentHref = window.location.href.replace(".html", "") + "END";

	/* Homepage */
    if (href == "/" || href == "/index.html") {
      if (pathname == "/") {
        el.classList.add("active");
      }
    } else {
      /* Other pages */
      if (currentHref.includes(href + "END")) {
        el.classList.add("active");

        /* Subnavigation: */
		
        if (el.closest("details")) {
          el.closest("details").setAttribute("open", "open");
          el.closest("details").classList.add("active");
        }

        if (el.closest("ul")) {
          if (el.closest("ul").closest("ul")) {
          	el.closest("ul").closest("ul").classList.add("active");
          }
        }
      }
    }
  });
}

function getNesting() {
  const numberOfSlashes = window.location.pathname.split("/").length - 1;
  if (numberOfSlashes == 1) return "./";
  return "../".repeat(numberOfSlashes - 1);
}
