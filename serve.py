import http.server, os, sys
os.chdir('/Users/igorsampaio/Desktop/citmail-landing')
port = int(sys.argv[1]) if len(sys.argv) > 1 else 4200
httpd = http.server.HTTPServer(('', port), http.server.SimpleHTTPRequestHandler)
httpd.serve_forever()
