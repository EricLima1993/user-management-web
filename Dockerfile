# ---------- Etapa 1: compila o Angular ----------
FROM node:24-alpine AS build
WORKDIR /app

# copia só os arquivos de dependências primeiro: enquanto eles não mudam,
# o Docker reaproveita o "npm ci" do cache e o build fica bem mais rápido
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build

# ---------- Etapa 2: serve os arquivos prontos com nginx ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/user-management-web/browser /usr/share/nginx/html
EXPOSE 80
