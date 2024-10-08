pipeline {
	agent {
		kubernetes {
			defaultContainer 'buildpack'
			yaml '''
kind: Pod
spec:
  containers:
  - name: buildpack
    image: maxmorhardt/topfilms-jenkins-buildpack:latest
    imagePullPolicy: Always
    securityContext:
      privileged: true
  - name: dind
    image: docker:27-dind
    imagePullPolicy: Always
    securityContext:
      privileged: true
'''
		}
	}

	parameters {
		string(name: 'BRANCH', defaultValue: params.BRANCH ?: 'main', description: 'Branch to checkout', trim: true)
		string(name: 'VERSION', defaultValue: params.VERSION ?: '1.0', description: 'Major minor version of the app', trim: true)
		booleanParam(name: 'DEPLOY_CA_CERT', defaultValue: false, description: 'Deploy ca cert as secret to k8s')
	}

	environment { 
		APP_NAME = 'admin-ui'
		CHART_NAME = 'topfilms-admin-ui'
		VERSION_FULL = "${params.VERSION}.${env.BUILD_NUMBER}"
		GITHUB_URL = 'https://github.com/Top-Films/admin-ui'

		DOCKER_REGISTRY = 'registry-1.docker.io'
		DOCKER_REGISTRY_FULL = "oci://${env.DOCKER_REGISTRY}"
	}

	stages {

		stage('Git Clone') {
			steps {
				script {
					checkout scmGit(
						branches: [[
							name: "$BRANCH"
						]],
						userRemoteConfigs: [[
							credentialsId: 'github',
							url: "$GITHUB_URL"
						]]
					)

					sh 'ls -lah'
					sh 'node -v'
				}
			}
		}

		stage('Node Build') {
			steps {
				script {
					sh """
						npm version $VERSION_FULL --no-git-tag-version
						npm install
						npm run test
						npm run build
					"""
				}
			}
		}

		stage('Docker CI') {
			steps {
				container('dind') {
					script {
						withCredentials([usernamePassword(credentialsId: 'docker', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
							sh 'echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin'

							sh 'docker buildx build --platform linux/arm64/v8 . --tag $DOCKER_USERNAME/$APP_NAME:$VERSION_FULL --tag $DOCKER_USERNAME/$APP_NAME:latest'
							sh 'docker push $DOCKER_USERNAME/$APP_NAME --all-tags'
						}
					}
				}
			}
		}

		stage('Helm CI') {
			steps {
				script {
					withCredentials([usernamePassword(credentialsId: 'docker', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
						sh '''
							cd helm

							echo "$DOCKER_PASSWORD" | helm registry login $DOCKER_REGISTRY --username $DOCKER_USERNAME --password-stdin

							helm package $APP_NAME --app-version=$VERSION_FULL --version=$VERSION_FULL
							helm push ./$CHART_NAME-$VERSION_FULL.tgz $DOCKER_REGISTRY_FULL/$DOCKER_USERNAME
						'''
					}
				}
			}
		}

		stage('Deploy CA Cert') {
			when {
				expression { 
					DEPLOY_CA_CERT == "true"
				}
			}
			steps {
				script {
					withCredentials([
						file(credentialsId: 'ca-cert', variable: 'CA_CERT'),
						file(credentialsId: 'ca-cert-private-key', variable: 'CA_CERT_PRIVATE_KEY'),
						file(credentialsId: 'kube-config', variable: 'KUBE_CONFIG')
					]) {
						sh 'mkdir -p $WORKSPACE/.kube && cp $KUBE_CONFIG $WORKSPACE/.kube/config'

						sh '''
							cp $CA_CERT $WORKSPACE/cert.pem
							cp $CA_CERT_PRIVATE_KEY $WORKSPACE/key.pem

							ls -lah

							set +e

							kubectl delete secret admin.topfilms.io-tls --namespace topfilms
							kubectl create secret tls admin.topfilms.io-tls --cert=cert.pem --key=key.pem --namespace topfilms

							set -e
						'''
					}
				}
			}
		}

		stage('Deploy') {
			steps {
				script {
					withCredentials([
						usernamePassword(credentialsId: 'docker', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD'), 
						file(credentialsId: 'kube-config', variable: 'KUBE_CONFIG')
					]) {
						sh 'mkdir -p $WORKSPACE/.kube && cp $KUBE_CONFIG $WORKSPACE/.kube/config'

						sh '''
							echo "$DOCKER_PASSWORD" | helm registry login $DOCKER_REGISTRY --username $DOCKER_USERNAME --password-stdin
							
							helm upgrade $APP_NAME $DOCKER_REGISTRY_FULL/$DOCKER_USERNAME/$CHART_NAME --version $VERSION_FULL --install --atomic --debug --history-max=3 --namespace topfilms --set image.tag=$VERSION_FULL
						'''
					}
				}
			}
		}

	}
}