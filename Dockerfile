FROM node:latest
RUN	apt-get update && \
	apt-get upgrade -y
RUN cd /home; git clone https://github.com/jsdelivr/api-sync; cd /home/api-sync; npm install
ADD start.sh /tmp/
EXPOSE 80
CMD ["bash", "/tmp/start.sh"]
