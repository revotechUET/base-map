FROM nginx:1.16.0-alpine

COPY dist/ /usr/share/nginx/html

# expose port 80
EXPOSE 80

# run nginx
CMD ["nginx", "-g", "daemon off;"]
