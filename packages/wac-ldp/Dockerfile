FROM maven
RUN git clone https://github.com/trellis-ldp/ldp-testsuite
WORKDIR ldp-testsuite
RUN mvn install -DskipTests -Dgpg.skip -Dmaven.javadoc.skip -B -V
RUN mvn package -DskipTests -Dgpg.skip -Dmaven.javadoc.skip -B -V
RUN mvn verify -Dgpg.skip -Dmaven.javadoc.skip
RUN wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
RUN bash -c 'source $HOME/.nvm/nvm.sh   && \
    nvm install 12                      && \
    nvm use 12                          && \
    npm install -g typescript'
ADD . .
RUN bash -c 'source $HOME/.nvm/nvm.sh   && \
    npm install'
RUN bash -c 'source $HOME/.nvm/nvm.sh   && \
    npm run build'
RUN mv ./target/ldp-testsuite-0.2.0-SNAPSHOT-shaded.jar ./ldp-testsuite.jar
CMD bash -c 'source $HOME/.nvm/nvm.sh && SKIP_WAC=true npm start' & java -jar ldp-testsuite.jar --basic --server http://localhost:8080
