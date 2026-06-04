[Role & Project Context] 너는 초등학생 대상 교육용 웹사이트 전문 개발자야. **'AI 우주탐사, 달과 화성'**라는 이름의 웹사이트를 만들 거야. 이 사이트는 아이들이 달과 화성의 지도를 탐험하며 AI 전문가와 대화하는 도구야
.
[Deployment & Security Strategy]
Deployment: GitHub Pages (정적 호스팅).
API Key Management: 보안과 편의성을 위해 URL 파라미터 방식을 사용함.
자바스크립트가 실행될 때 현재 URL에서 ?key=YOUR_API_KEY 부분을 찾아 API 키로 자동 설정해야 함.
만약 URL에 키가 없다면, 사용자에게 "선생님께 받은 특별 링크로 접속해 주세요!"라는 친절한 안내 메시지를 띄워줘.
[Feature Requirements]
Selection Screen: 달(Moon)과 화성(Mars)을 선택하는 메인 화면. 우주적인 테마의 반응형 UI
.
Exploration Interface:
NASA 고해상도 지도를 전체 화면으로 보여줌.
Drawing Tool: 지도 위에 마우스나 터치로 자유롭게 동그라미를 그릴 수 있는 투명 Canvas 구현, 동그라미 치면 그 부분에 대한걸 ai가 답해줌.
.
'전문가 분석 요청' 버튼 클릭 시, 동그라미 친 영역의 이미지 데이터와 좌표를 Gemini API로 전송.
Mars Rover View: 화성 탐사 시 '퍼서비어런스 로버' 시점의 실제 사진들로 전환하는 모드 추가
.
AI Expert Interaction:
Persona: 30년 경력의 NASA 지질학자. 10살 아이들에게 다정하고 쉽게 설명함, 다만 아이들의 짓꾸진 질문은 답 회피, 추가적으로 과학적이게 설명을 해도 됨.
.
Response UI: 답변은 깔끔한 팝업(Modal) 창으로 띄우고, 답변 아래에 추가 질문을 할 수 있는 입력창을 포함할 것
.
[Technical Specs]
Frontend: HTML5, CSS3, Vanilla JavaScript.
AI Model: Gemini 1.5 Flash API (멀티모달 기능 활용).
Responsiveness: 노트북과 휴대폰 모든 화면 비율에서 지도가 깨지지 않고 그리기가 가능해야 함
.
[Output Instructions]
index.html 내부에 CSS와 JS를 포함하거나, 명확히 분리된 3개의 파일 코드를 생성해 줘.
URL 파라미터에서 키를 추출하는 const urlParams = new URLSearchParams(window.location.search); 로직을 반드시 포함해 줘.
초등학생들이 좋아할 만한 세련되고 미래지향적인 CSS 디자인을 적용해 줘.

고해상도 달, 화성 지도는 map 폴더에 있어
화성 선택 후 나오는 로버 사진들은 mars_robo 폴더에 있어.

달은 달 지도 사진과 높낮이를 보여주는 사진이 있어. 서로 투영해서 봐야할것같아 https://svs.gsfc.nasa.gov/4720 이거 참고해줘. 달과 화성 이미지는 실제 달처럼 구형으로도 만들어 극지방 빼고 위 아래가 아닌 좌우로 볼수있게 하면 좋을것같아. 지도 아이콘을 누르면 지도처럼 평평하게도 볼수있게 하면 좋을것같아.



달과 화성 선택하는건 귀엽게 이모티콘으로 만들어서 할 수 있을까? 주변에 우주선 날라다니는 느낌으로

케쉬 시스탬을 이옹해서 전에 있던 대화 저장하는것도 가능하면 해주라.

추가로 달및 화성탐사 계획표를 만들 수 있게 메모장 같은 곳도 만들면 좋을 것같아 따로 들어가서 쓸 수 있게.

동그라미 그린 부분을 포함한 전체 지도를 ai가 읽어드리고 정확한 위치를 파악후 그에 대한 정보를 줄수있게 진행. 지도의 용량이 크기떄문에 위치 파악만 할 수 있을 정도로 화질 낮게 변환 후 ai 질문.