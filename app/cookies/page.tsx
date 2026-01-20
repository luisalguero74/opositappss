import React from "react";

export const metadata = {
  title: "Política de cookies | opositAPPSS",
};

export default function PoliticaCookiesPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 text-sm text-gray-800">
      <h1 className="text-2xl font-bold mb-6">Política de cookies</h1>

      <p className="mb-4">
        Esta Política de cookies explica qué son las cookies, qué tipos utiliza la Plataforma <strong>opositAPPSS</strong>
        y con qué finalidades. Puedes modificar en cualquier momento la configuración de tu navegador para gestionar
        o bloquear el uso de cookies.
      </p>

      <h2 className="text-lg font-semibold mt-4 mb-2">1. ¿Qué es una cookie?</h2>
      <p className="mb-4">
        Una cookie es un pequeño archivo de texto que se almacena en tu dispositivo cuando visitas determinados sitios
        web. Las cookies permiten, entre otras cosas, que el sitio recuerde tus acciones y preferencias durante un
        período de tiempo, para que no tengas que volver a configurarlas cada vez que accedes.
      </p>

      <h2 className="text-lg font-semibold mt-4 mb-2">2. Tipos de cookies utilizadas</h2>
      <p className="mb-2">En la Plataforma se pueden utilizar los siguientes tipos de cookies:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>
          <strong>Cookies técnicas</strong>: necesarias para el funcionamiento básico de la Plataforma, como el inicio
          de sesión o la gestión de la navegación. Son imprescindibles para poder utilizar los servicios ofrecidos.
        </li>
        <li>
          <strong>Cookies de preferencia o personalización</strong>: permiten recordar determinadas preferencias de la
          persona usuaria, como el idioma o ciertas configuraciones de la interfaz.
        </li>
        <li>
          <strong>Cookies de análisis o medición</strong>: permiten obtener estadísticas anónimas sobre el uso de la
          Plataforma (por ejemplo, páginas más visitadas, tiempo de permanencia, etc.) con el fin de mejorar el
          servicio.
        </li>
        <li>
          <strong>Cookies de publicidad</strong> (en su caso): permiten gestionar de forma más eficaz los espacios
          publicitarios, mostrando anuncios relacionados con los intereses de la persona usuaria.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-4 mb-2">3. Gestión y eliminación de cookies</h2>
      <p className="mb-4">
        Puedes permitir, bloquear o eliminar las cookies instaladas en tu dispositivo mediante la configuración de las
        opciones del navegador que utilices. Ten en cuenta que, si bloqueas determinadas cookies técnicas, es posible
        que algunos servicios de la Plataforma dejen de estar disponibles o no funcionen correctamente.
      </p>

      <h2 className="text-lg font-semibold mt-4 mb-2">4. Cookies de terceros</h2>
      <p className="mb-4">
        La Plataforma puede utilizar servicios de terceros que instalen cookies desde sus propios dominios (por ejemplo,
        herramientas de analítica o redes publicitarias). Estos terceros son responsables de las cookies que instalan y
        de los tratamientos que realizan, de acuerdo con sus propias políticas de privacidad y cookies.
      </p>

      <h2 className="text-lg font-semibold mt-4 mb-2">5. Actualizaciones de la Política de cookies</h2>
      <p className="mb-4">
        Esta Política de cookies puede actualizarse para reflejar cambios en el uso de cookies en la Plataforma o en la
        normativa aplicable. La versión vigente estará siempre disponible en esta página.
      </p>

      <p className="mt-8 text-xs text-gray-500">
        Última actualización: 19 de enero de 2026
      </p>
    </main>
  );
}
