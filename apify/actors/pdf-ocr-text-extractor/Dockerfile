FROM apify/actor-node:22

# Poppler (PDF text and page images) and Tesseract OCR with 20 languages. The base image may be
# Alpine or Debian, so both package managers are covered.
USER root
RUN if command -v apk > /dev/null; then \
      apk add --no-cache poppler-utils tesseract-ocr \
        tesseract-ocr-data-eng tesseract-ocr-data-deu tesseract-ocr-data-fra tesseract-ocr-data-spa \
        tesseract-ocr-data-ita tesseract-ocr-data-por tesseract-ocr-data-nld tesseract-ocr-data-pol \
        tesseract-ocr-data-tur tesseract-ocr-data-rus tesseract-ocr-data-ukr tesseract-ocr-data-ara \
        tesseract-ocr-data-hin tesseract-ocr-data-tha tesseract-ocr-data-vie tesseract-ocr-data-ind \
        tesseract-ocr-data-chi_sim tesseract-ocr-data-chi_tra tesseract-ocr-data-jpn tesseract-ocr-data-kor; \
    else \
      apt-get update && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr \
        tesseract-ocr-eng tesseract-ocr-deu tesseract-ocr-fra tesseract-ocr-spa \
        tesseract-ocr-ita tesseract-ocr-por tesseract-ocr-nld tesseract-ocr-pol \
        tesseract-ocr-tur tesseract-ocr-rus tesseract-ocr-ukr tesseract-ocr-ara \
        tesseract-ocr-hin tesseract-ocr-tha tesseract-ocr-vie tesseract-ocr-ind \
        tesseract-ocr-chi-sim tesseract-ocr-chi-tra tesseract-ocr-jpn tesseract-ocr-kor \
      && rm -rf /var/lib/apt/lists/*; \
    fi \
    && tesseract --list-langs

# Some packages already in the base image belong to root, so the install runs as root and the
# app folder is then handed to the Actor's user.
COPY package*.json ./
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && rm -r ~/.npm \
    && chown -R myuser:myuser /usr/src/app
USER myuser

COPY --chown=myuser:myuser . ./

CMD npm start --silent
