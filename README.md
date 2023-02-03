<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a name="readme-top"></a>
<!--
*** Thanks for checking out the Best-README-Template. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING! :D
-->



<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/anatoliyzhang/gooser">
    <img src="https://github.com/anatoliyzhang/gooser/raw/main/server/client/public/img/gooser.png" alt="Logo">
  </a>

<h3 align="center">GOOSER</h3>

  <p align="center">
    A simple SCADA system.
</div>

<!-- ABOUT THE PROJECT -->
## About GOOSER
Currently this application consists of three parts: a web server (with Websocket) an agent(or more agents) and a client(Web Browser).

The modbus_rtu_agent application is to read data from devices via Modbus-RTU protocol, then send data to the server via Websocket connection.

The server application connects with the agents and clients(browsers). It receives data from agents, stores them to database, and sends data to clients(browsers) with some data visualization functions. It also handles instructions from clients, such as device management, display management.

    This application is the open-sourced version of Goose 1.0, with a complete rewrite in Rust.


<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Scheme
<img src="https://github.com/anatoliyzhang/gooser/raw/main/screenshots/gooser-scheme.png" alt="Scheme">
<!-- ROADMAP -->
## Features

- Easy installation
- Works without internet, or with.
- Agents can be deployed in hosts other than the server, or in the same host.
- Database won't be too large as it is automatically created by month number.
  - Easy to back up, just copy the database file history[year][month].db to your desired location
  - history data query would be efficient.
  - additional database service is not necessary.
- Alarm types include: visual flashing element, sound alarm, synthetic voice alarm. 
- Flexible data observation
  - data could be displayed in line chart, bar chart, gauge, graph, geomap, and table, thanks to [echarts](https://echarts.apache.org/) and [Tabulator](https://tabulator.info/)
  - User can display unlimited data with any desired display chart, if they have many monitors(screens).


<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Installation

0. Make sure you have the Real or Simulated device conneted to your serial port.
1. Download the latest release
2. Unpack the downloaded package in your desired directory.


<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

1. Start the server by executing server.exe in the server directory
2. Start the modbus_rtu_agent
3. Use a web browser to open:
   ```url
   http://127.0.0.1:4000/
   ```
4. Log in to the system using name `su`, password `a`.
5. Edit the device settings or create a new device setting. Make sure you've configured the device correctly.

<p align="right">(<a href="#readme-top">back to top</a>)</p>





### Built With

#### Server side
* [warp](https://crates.io/crates/warp)
* [rusqlite](https://crates.io/crates/rusqlite)

##### Server side for client
* [admin-lte](https://github.com/ColorlibHQ/AdminLTE)
* [echarts](https://echarts.apache.org/)
* [gridstack](https://github.com/gridstack/gridstack.js)
* [tabulator](https://tabulator.info/)

#### Modbus_RTU_Agent
* [tokio-modbus](https://github.com/slowtec/tokio-modbus)
<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- LICENSE -->
## License

Distributed under the GPL-2.0 License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact
anatoliyzhang@hotmail.com
Author: [https://www.zhangshifeng.com](https://www.zhangshifeng.com)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* DOCUMENTATION IS NOT READY!
  But if you have problems, please contact me.


<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/anatoliyzhang/gooser.svg?style=for-the-badge
[contributors-url]: https://github.com/anatoliyzhang/gooser/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/anatoliyzhang/gooser.svg?style=for-the-badge
[forks-url]: https://github.com/anatoliyzhang/gooser/network/members
[stars-shield]: https://img.shields.io/github/stars/anatoliyzhang/gooser.svg?style=for-the-badge
[stars-url]: https://github.com/anatoliyzhang/gooser/stargazers
[issues-shield]: https://img.shields.io/github/issues/anatoliyzhang/gooser.svg?style=for-the-badge
[issues-url]: https://github.com/anatoliyzhang/gooser/issues
[license-shield]: https://img.shields.io/github/license/anatoliyzhang/gooser.svg?style=for-the-badge
[license-url]: https://github.com/anatoliyzhang/gooser/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/shifeng-zhang-4b856a24
[product-screenshot]: [images/screenshot.png] (https://github.com/anatoliyzhang/gooser/raw/main/screenshots/dashboard-demo.png)
