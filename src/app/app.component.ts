import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { from } from 'rxjs';
import { CookieService } from 'ngx-cookie-service'
import { parse } from 'querystring';
import { Router, NavigationEnd } from '@angular/router';

import * as PlotlyJS from 'plotly.js/dist/plotly.js';
import { PlotlyModule } from 'angular-plotly.js';

PlotlyModule.plotlyjs = PlotlyJS;


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})


export class AppComponent implements OnInit {

  ordered_keys: Array<string>;;

  specs_obj = new Map([]);
  available_szs = new Map([]);

  film_specs_obj = new Map([]);
  film_type_rates = new Map([]);

  cut_memo = new Map([]);

  wastage: any;
  wastage_status: any;
  sz: any;
  req_pck_num: any;
  output_qty: any;
  output_qty_per_pck: any;
  total_weight: any;
  efficiency: any
  leafs_per_sheet: any;
  max_possible: any;

  cost_per_pck: any;
  total_cost: any;
  cost_per_piece: any;
  ns: any;
  card_length: any;
  card_width: any;

  div_costing: boolean;
  div_size: boolean;

  film_total_length: any;
  film_cost_per_sheet: any;
  film_cost_total: any;

  graph: any;


  @ViewChild('canvas', { static: true })
  canvas: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D;

  constructor(private cookieService: CookieService, private router: Router) {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.set_input_values();

      }
    });
  }

  ngOnInit(): void {

    this.div_costing = false;
    this.div_size = true;

    // card sizes
    this.available_szs.set('card', [
      [20, 30],
      [22, 28],
      [23, 36],
      [25, 30],
      [25, 36],
      [31, 43],
      [30, 50],
      [30, 40],
      [36, 50],
    ]);

    // paper sizes
    this.available_szs.set('paper', [
      //      [29, 43],
      [54, 24],
    ]);

    /* initialize graph layout */
    this.graph = {
      data: [],
      layout: {
        title: "", width: 400, height: 450, showlegend: true, displaylogo: false,
        xaxis: { linecolor: 'gray', linewidth: .5, mirror: true, ticklen: 8, range: [0, 50], showgrid: true, nticks: 10, tickcolor: 'red' },
        yaxis: { linecolor: 'gray', linewidth: .5, mirror: true, ticklen: 8, range: [0, 50], showgrid: true, tickcolor: 'red' },
        margin: { t: 85, b: 55 },
      }
    };

    this.ordered_keys = ['material', 'card_length', 'card_width', 'card_qty', 'boxes_per_lw', 'pkr_per_kg', 'gsm', 'sheets_per_packet'];

    this.specs_obj.set('material', ['card', 'Card/Paper', '', '']);
    this.specs_obj.set('card_length', [9, 'Length', 'Inches']);
    this.specs_obj.set('card_width', [8, 'Width', 'Inches']);
    this.specs_obj.set('card_qty', [1000, 'Total Quantity', 'Number']);
    this.specs_obj.set('boxes_per_lw', [1, 'Number of pieces on the plate', 'e.g., 1 up or 2 up']);
    this.specs_obj.set('pkr_per_kg', [210, 'Cost per Kg', 'PKR']);
    this.specs_obj.set('gsm', [300, 'GSM (grams per square meter)', 'Number']);
    this.specs_obj.set('sheets_per_packet', [100, 'Number of sheets per packet', 'Number']);

    this.film_type_rates.set('matt', [1.5]);
    this.film_type_rates.set('gloss', [1.10]);
    this.film_type_rates.set('special', [3.0]);

    this.film_specs_obj.set('film_type', ['gloss']);
    this.film_specs_obj.set('film_quantity', [1000]);
    this.film_specs_obj.set('film_length', [9]);
    this.film_specs_obj.set('film_width', [8]);

    this.set_specs_obj_from_cookies();
    this.set_film_specs_obj_from_cookies();

    this.changeEventHandler();

  }

  set_inherited_values(): void {
    this.film_specs_obj.get('film_quantity')[0] = this.specs_obj.get('card_qty')[0];
    this.film_specs_obj.get('film_length')[0] = this.specs_obj.get('card_length')[0];
    this.film_specs_obj.get('film_width')[0] = this.specs_obj.get('card_width')[0];
    this.set_input_values();
  }

  set_input_values(): void {
    for (let key of this.specs_obj.keys()) {
      if (key + "" == "material") {
        if (this.specs_obj.get('' + key)[0] + "" == "card") {
          document.getElementById('input_' + key + "_card").setAttribute('checked', 'true');

        } else {
          document.getElementById('input_' + key + "_paper").setAttribute('checked', 'true');
        }
      } else {
        document.getElementById('input_' + key).setAttribute('value', this.specs_obj.get('' + key)[0] + "");
      }
    }

    if (this.film_specs_obj.get('film_type')[0] + "" == "matt") {
      document.getElementById('input_matt_film').setAttribute('checked', 'true');

    } else if (this.film_specs_obj.get('film_type')[0] + "" == "gloss") {
      document.getElementById('input_gloss_film').setAttribute('checked', 'true');

    } else {
      document.getElementById('input_special_film').setAttribute('checked', 'true');
    }

    this.setFilmRateField();
    document.getElementById('input_film_quantity').setAttribute('value', this.film_specs_obj.get('film_quantity')[0] + "");
    document.getElementById('input_film_length').setAttribute('value', this.film_specs_obj.get('film_length')[0] + "");
    document.getElementById('input_film_width').setAttribute('value', this.film_specs_obj.get('film_width')[0] + "");

    document.getElementById('input_film_matt_rate').setAttribute('value', this.film_type_rates.get('matt')[0] + "");
    document.getElementById('input_film_gloss_rate').setAttribute('value', this.film_type_rates.get('gloss')[0] + "");
    document.getElementById('input_film_special_rate').setAttribute('value', this.film_type_rates.get('special')[0] + "");


  }

  add_size(event: any): void {
    var temp: any = this.available_szs.get(this.specs_obj.get('' + 'material')[0]);

    var ele1: any = document.getElementById('sz1_' + this.specs_obj.get('' + 'material')[0]);
    var ele2: any = document.getElementById('sz2_' + this.specs_obj.get('' + 'material')[0]);

    var size_lft = parseInt(ele1.value + '');
    var size_rht = parseInt(ele2.value + '');

    var szs = [];
    for (var it = 0; it < temp.length; it = it + 1) {
      if (temp[it][0] == size_lft && temp[it][1] == size_rht) {
        return;
      }
      if (temp[it][0] == size_rht && temp[it][1] == size_lft) {
        return;
      }

    }

    var temp: any = this.available_szs.get(this.specs_obj.get('' + 'material')[0]);
    temp[temp.length] = [size_lft, size_rht];
    this.available_szs.set(this.specs_obj.get('' + 'material')[0], temp);

    this.changeEventHandler();


  }

  remove_size(event: any): void {
    var temp: any = this.available_szs.get(this.specs_obj.get('' + 'material')[0]);

    var szs = [];
    for (var it = 0; it < temp.length; it = it + 1) {
      if (temp[it][0] == (parseInt(event.currentTarget.id.split('_')[1])) && temp[it][1] == (parseInt(event.currentTarget.id.split('_')[2]))) {
        console.log(it);
        temp.splice(it, 1);
      }
    }
    this.available_szs.set(this.specs_obj.get('' + 'material')[0], temp);
    this.changeEventHandler();

  }

  setFilmRateField(): void {
    var temp_rate: Number;
    if (this.film_specs_obj.get('film_type')[0] + "" == "matt") {
      temp_rate = Number(this.film_type_rates.get('matt')[0]);

    } else if (this.film_specs_obj.get('film_type')[0] + "" == "gloss") {
      temp_rate = Number(this.film_type_rates.get('gloss')[0]);

    } else {
      temp_rate = Number(this.film_type_rates.get('special')[0]);
    }

    document.getElementById('input_rate_film').setAttribute('value', temp_rate.toString() + " Rs. per sq. foot ");
    document.getElementById('input_rate_film').setAttribute('disabled', "isDisabled");
  }

  changeEventHandler(): void {

    this.set_cookies_from_specs_obj();
    this.set_cookies_from_film_specs_obj();

    var szs_temp: any = this.available_szs.get(this.specs_obj.get('material')[0]);

    var szs = [];

    var element: any = document.getElementById('input_compute_mode');
    if (element.checked) {
      for (var it = 0; it < szs_temp.length; it = it + 1) {
        if (szs_temp[it][0]>szs_temp[it][1]){
          szs[szs.length] = [szs_temp[it][0], szs_temp[it][1]];

        }else{
          szs[szs.length] = [szs_temp[it][1], szs_temp[it][0]];
        }        
      }

    }else{
      for (var it = 0; it < szs_temp.length; it = it + 1) {
        szs[szs.length] = [szs_temp[it][0], szs_temp[it][1]];
        szs[szs.length] = [szs_temp[it][1], szs_temp[it][0]];
      }
    }


    this.cl_packet_size(szs);
    //this.generatePlot();
    this.update_plotly_graph();
    this.cl_film_cost();

    this.setFilmRateField();

    var element: any = document.getElementById('input_compute_mode');
    if (element.checked) {
      console.log('checkbox is true');

    } else {
      console.log('checkbox is false');
    }

  }

  cl_film_cost(): void {
    //this.film_total_length = 0;
    //this.film_cost_per_sheet = 0;
    //this.film_cost_total = 0;
    var temp_rate: any;
    var temp_length: any;
    var temp_width: any;
    var temp_quantity: any;


    temp_rate = parseFloat(this.film_type_rates.get(this.film_specs_obj.get('film_type')[0] + "")[0] + "");
    temp_length = parseFloat(this.film_specs_obj.get('film_length')[0]);
    temp_width = parseFloat(this.film_specs_obj.get('film_width')[0]);
    temp_quantity = parseInt(this.film_specs_obj.get('film_quantity')[0]);

    this.film_total_length = parseFloat(0.0254 + '') * parseFloat(this.film_specs_obj.get('film_length')[0]) * parseFloat(this.film_specs_obj.get('film_quantity')[0]);
    this.film_cost_per_sheet = (1.0 / 144.0) * temp_length * temp_width * temp_rate;
    this.film_cost_total = this.film_cost_per_sheet * temp_quantity;
  }


  cl_packet_size(szs: any) {
    var ns = [];
    var sz_max; var ns_max;
    var max_efficiency = Number.NEGATIVE_INFINITY;
    var max_max_possible: number;
    var max_leafs_per_sheet: number;

    var card_length = this.specs_obj.get('card_length')[0];
    var card_width = this.specs_obj.get('card_width')[0];
    var card_qty = this.specs_obj.get('card_qty')[0];
    var boxes_per_lw = this.specs_obj.get('boxes_per_lw')[0];
    var sheets_per_packet = this.specs_obj.get('sheets_per_packet')[0];
    var pkr_per_kg = this.specs_obj.get('pkr_per_kg')[0];
    var gsm = this.specs_obj.get('gsm')[0];

    for (var it = 0; it < szs.length; it++) {
      ns = [szs[it][0] / card_length, szs[it][1] / card_width];
      ns[0] = parseFloat(ns[0]);
      ns[1] = parseFloat(ns[1]);

      var max_possible = (szs[it][0] * szs[it][1]) / (card_width * card_length);
      var leafs_per_sheet = Math.floor(ns[0]) * Math.floor(ns[1]);

      var element: any = document.getElementById('input_compute_mode');
      if (element.checked) {
        leafs_per_sheet = this.guillotine_cut(parseFloat(szs[it][0]), parseFloat(szs[it][1]), parseFloat(card_width), parseFloat(card_length));
        ns = undefined;
        console.log('-----' + leafs_per_sheet + '-----');
      }
      var efficiency = leafs_per_sheet / max_possible;

      if (efficiency > max_efficiency) {
        max_efficiency = efficiency;
        sz_max = szs[it];
        ns_max = ns;
        max_max_possible = max_possible;
        max_leafs_per_sheet = leafs_per_sheet;
      }
    }

    var pck_cnt = card_qty / (max_leafs_per_sheet * boxes_per_lw * sheets_per_packet);
    var req_pck_num = pck_cnt;
    var output_qty = req_pck_num * sheets_per_packet * max_leafs_per_sheet * boxes_per_lw;
    var wastage = ((sz_max[0] * sz_max[1]) - (max_leafs_per_sheet * card_width * card_length)) * pck_cnt * sheets_per_packet * (1.0 / 1550.00310) * (gsm / 1000.0) * pkr_per_kg; // wastage in pkr

    var req_pck_num_min = req_pck_num;
    var output_qty_min = output_qty;
    var output_qty_per_pck = output_qty / req_pck_num;

    var total_weight = req_pck_num * sheets_per_packet * (gsm / 1000) * sz_max[0] * sz_max[1] * (1 / 1550.00310);
    var cost_per_pck = pkr_per_kg * sheets_per_packet * (gsm / 1000) * sz_max[0] * sz_max[1] * (1 / 1550.00310);
    var total_cost = req_pck_num * cost_per_pck;
    var cost_per_piece = total_cost / output_qty;

    this.wastage = wastage;
    if (this.wastage <= 250) {
      this.wastage_status = " :) ";

    } else {
      this.wastage_status = " Caution: wastage cost is high :(";

    }
    this.sz = sz_max;
    this.req_pck_num = req_pck_num_min;
    this.output_qty = output_qty_min;
    this.output_qty_per_pck = output_qty_per_pck;

    this.cost_per_pck = cost_per_pck;
    this.total_cost = total_cost;
    this.cost_per_piece = cost_per_piece;
    this.ns = ns_max;
    this.card_length = card_length;
    this.card_width = card_width;
    this.total_weight = total_weight;

    this.leafs_per_sheet = max_leafs_per_sheet;
    this.max_possible = max_max_possible;
    this.efficiency = max_efficiency;

  }



  plotly_data_append(a: any, b: any): void {
    this.graph.data[this.graph.data.length] = { x: a, y: b, name: '-' + (this.graph.data.length + 1) + '-', mode: 'lines+markers', opacity: 1.0, marker: { size: 2, symbol: 'star-square' } };

  }

  update_plotly_graph(): void {

    this.graph.layout.title = "Sheet size: [" + this.sz[0] + "'' x " + this.sz[1] + "''] <br> " + "Box/piece size: [" + this.card_length + "'' x " + this.card_width + "''] <br> ";

    this.graph.data = [];
    var a; var b;
    var L:number = this.sz[0];
    var W:number = this.sz[1];

    this.graph.layout.xaxis.range = [0, W];
    this.graph.layout.yaxis.range = [0, L];

    var element: any = document.getElementById('input_compute_mode');
    if (element.checked) {
      console.log('-----' + L + '-----' + W + '-----');

      var L_temp = L;
      var W_temp = W;
      var x:number = this.card_width;
      var y:number = this.card_length;

      var remaining = [];

      remaining[0] = [L, W, x, y, 0.0, 0.0];
      while (remaining.length != 0) {

        L = parseFloat(remaining[0][0]);
        W = parseFloat(remaining[0][1]);
        x = parseFloat(remaining[0][2]);
        y = parseFloat(remaining[0][3]);

        var px = remaining[0][4];
        var py = remaining[0][5];

        remaining.shift(); 

        var key: string = L.toFixed(4) + "," + W.toFixed(4) + "," + x.toFixed(4) + "," + y.toFixed(4);

        if (this.cut_memo.has(key)) {
          var nop = this.cut_memo.get(key)[0];
          var ind = this.cut_memo.get(key)[1];


          var cut_data = this.cl_cut(L, W, x, y, ind);

          var L1 = cut_data.L1;
          var W1 = cut_data.W1;
          var L2 = cut_data.L2;
          var W2 = cut_data.W2;

          var px1, py1, px2, py2;
          var cut_coord_L = [], cut_coord_S = [];

          if (ind == 1) {
            /*  X cut, x-orientation  */
            px1 = px;
            py1 = py + y;
            px2 = px + x;
            py2 = py;

            cut_coord_L = [px2, px2, py2, py2 + L];
            cut_coord_S = [px1, px2, py1, py1];

          } else if (ind == 2) {
            /* X cut, y-orientation     */
            px1 = px;
            py1 = py + x;
            px2 = px + y;
            py2 = py;

            cut_coord_L = [px2, px2, py2, py2 + L];
            cut_coord_S = [px1, px2, py1, py1];

          } else if (ind == 3) {
            /* Y cut, x - orientation */
            px1 = px + x;
            py1 = py;
            px2 = px;
            py2 = py + y;

            cut_coord_L = [px2, px2 + W, py2, py2];
            cut_coord_S = [px1, px1, py1, py2];

          } else if (ind == 4) {
            /* Y cut, y - orientation */
            px1 = px + y;
            py1 = py;
            px2 = px;
            py2 = py + y;
  
            cut_coord_L = [px2, px2 + W, py2, py2];
            cut_coord_S = [px1, px1, py1, py1];
  
          }

          var a;var b;

          a=[cut_coord_L[0], cut_coord_L[1]];b=[cut_coord_L[2], cut_coord_L[3]];
          if (a[0]>=0 && a[1]<=W_temp && b[0]>=0 && b[1]<=L_temp){
            if (Math.abs(L2*W2)>1e-8){
              this.graph.data[this.graph.data.length] = { x: a, y: b, name: '-' + (this.graph.data.length + 1) + '-', mode: 'lines+markers', opacity: 1.0, marker: { size: 2, symbol: 'star-square' } };
              console.log(a);
            }
          }
                        
          a=[cut_coord_S[0], cut_coord_S[1]];b=[cut_coord_S[2], cut_coord_S[3]];
          if (a[0]>=0 && a[1]<=W_temp && b[0]>=0 && b[1]<=L_temp){
            this.graph.data[this.graph.data.length] = { x: a, y: b, name: '-' + (this.graph.data.length + 1) + '-', mode: 'lines+markers', opacity: 1.0, marker: { size: 2, symbol: 'star-square' } };
            console.log(a);
          }
                  
          if ( Math.abs(L1)>1e-08 && Math.abs(W1)>1e-08) {
            remaining[remaining.length]=[L1,W1,x,y, px1,py1];
          }

          if ( Math.abs(L2)>1e-08 && Math.abs(W2)>1e-08){
            remaining[remaining.length]=[L2,W2,x,y, px2,py2];
          }

        }
      }

    } else {
      /* vertical lines */
      for (var it = 0; it < (Math.floor(parseFloat(this.ns[1])) - 1); it++) {
        a = [this.card_width * (it + 1), this.card_width * (it + 1)]; b = [0, L];
        this.plotly_data_append(a, b);
      }
      /* vertical volume */
      if (Math.abs(this.card_width * (it + 1) - W) > .1) {
        a = [this.card_width * (it + 1), this.card_width * (it + 1), W, W, this.card_width * (it + 1)];
        b = [0, L, L, 0, 0];
        this.graph.data[this.graph.data.length] = { x: a, y: b, name: '-' + (this.graph.data.length + 1) + '-', mode: 'lines+markers', opacity: 0.6, marker: { size: 2 }, fill: "toself" };
      }

      /* horizontal lines */
      for (var it = 0; it < (Math.floor(parseFloat(this.ns[0])) - 1); it++) {
        a = [0, W]; b = [this.card_length * (it + 1), this.card_length * (it + 1)];
        this.plotly_data_append(a, b);
      }

      /* horizontal volume */
      if (Math.abs(this.card_length * (it + 1) - L) > .1) {
        a = [0, 0, W, W, 0];
        b = [this.card_length * (it + 1), L, L, this.card_length * (it + 1), this.card_length * (it + 1)];
        this.graph.data[this.graph.data.length] = { x: a, y: b, name: '-' + (this.graph.data.length + 1) + '-', mode: 'lines+markers', opacity: 0.6, marker: { size: 2 }, fill: "toself" };
      }

    }

    PlotlyJS.newPlot('div_plotly_graph', this.graph.data, this.graph.layout);
    console.log(this.graph);

  }

  generatePlot(): void {

    var c = document.getElementById("sheet_canvas");

    this.ctx = this.canvas.nativeElement.getContext('2d');

    var c_width = this.ctx.canvas.width;
    var c_height = this.ctx.canvas.height;

    this.ctx.clearRect(0, 0, c_width, c_height);
    this.ctx.beginPath();

    //this.ctx.globalAlpha = 0.5;
    var p_width = 220;
    var p_hight = 220 * (this.sz[0] / this.sz[1]);
    // draw rectangle
    var x_coordinate = c_width / 2.0 - p_width / 2.0;

    var y_offset = 50.0;

    c_width = 400;
    c_height = p_hight + 60;
    this.ctx.strokeRect(x_coordinate, y_offset, parseFloat(p_width + ''), p_hight);
    this.ctx.strokeStyle = 'red';
    this.ctx.fillStyle = 'red';

    this.ctx.beginPath();
    // horizontal lines                    
    var x_shift = (p_width * this.card_width / this.sz[1]);
    for (var it = 0; it < Math.floor(parseFloat(this.ns[1])); it++) {
      this.ctx.moveTo(c_width / 2.0 - p_width / 2.0 + (it + 1) * x_shift, y_offset);
      this.ctx.lineTo(c_width / 2.0 - p_width / 2.0 + (it + 1) * x_shift, p_hight + y_offset);
      this.ctx.stroke();
    }
    x_coordinate = c_width / 2.0 - p_width / 2.0 + (Math.floor(parseFloat(this.ns[1]))) * x_shift;
    this.ctx.fillRect(x_coordinate, y_offset, p_width - Math.floor(parseFloat(this.ns[1])) * x_shift, p_hight);
    var x_coordinate_end = x_coordinate; // + Math.floor($scope.ns[1])*x_shift;
    this.ctx.closePath();

    this.ctx.beginPath();
    this.ctx.strokeStyle = 'blue';
    this.ctx.fillStyle = 'blue';
    // vertical lines
    var y_shift = p_hight * this.card_length / this.sz[0];
    x_coordinate = c_width / 2.0 - p_width / 2.0;

    console.log('ns_' + this.ns)
    for (it = 0; it < Math.floor(parseFloat(this.ns[0])); it++) {
      this.ctx.moveTo(x_coordinate, y_offset + y_shift * (it + 1));
      this.ctx.lineTo((p_width) + x_coordinate, y_offset + y_shift * (it + 1));
      this.ctx.stroke();
    }
    var y_coordinate = y_offset + y_shift * Math.floor(parseFloat(this.ns[0]));
    console.log("   " + Math.abs(p_hight - Math.floor(parseFloat(this.ns[0])) * y_shift) + "  ");
    if (Math.abs(p_hight - Math.floor(parseFloat(this.ns[0])) * y_shift) > 0.0001) {
      this.ctx.fillRect(x_coordinate, y_coordinate, p_width, p_hight - Math.floor(this.ns[0]) * y_shift);
    }
    //ctx.fillText( $scope.ns, 10, 60);
    this.ctx.closePath();

    this.ctx.beginPath();
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = 'black';
    this.ctx.fillStyle = 'black';
    this.ctx.fillText('Sheet size : [ ' + this.sz[0] + '" x ' + this.sz[1] + '" ]', (c_width / 2.0 - 50.0), 8.0);
    this.ctx.fillText('Box/piece size : [ ' + parseFloat(this.card_length).toFixed(2) + ' x ' + parseFloat(this.card_width).toFixed(2) + ' ]', c_width / 2 - 66.0, 26.0);

    var blue_area = (this.sz[0] - Math.floor(this.ns[0]) * this.card_length);
    if (Math.abs(blue_area) > 0.00001) {
      this.ctx.strokeStyle = 'blue';
      this.ctx.fillStyle = 'blue';
      this.ctx.fillText('Blue  Area: [' + blue_area.toFixed(2) + ' x ' + this.sz[1] + ']', (c_width - p_width) / 2.0 + 4, y_offset - 4 + Math.floor(this.ns[0]) * y_shift);
    }
    this.ctx.save();
    var red_area = (this.sz[1] - Math.floor(this.ns[1]) * this.card_width);
    if (Math.abs(red_area) > 0.000001) {
      this.ctx.textAlign = "left";
      this.ctx.textBaseline = "middle";
      this.ctx.translate(x_coordinate_end - 8, 100 + y_offset);
      this.ctx.rotate(-Math.PI / 2);
      this.ctx.strokeStyle = 'red';
      this.ctx.fillStyle = 'red';
      this.ctx.fillText('Red  Area: [' + this.sz[0] + ' x ' + red_area.toFixed(2) + ']', 0, 0);
    }
    this.ctx.restore();
    this.ctx.closePath();

    // vertical green line
    this.draw_vertical_line(this.ctx, c_width / 2.0 - p_width / 2.0, y_offset, y_offset + y_shift, this.card_length + "\'\'")

    // horizontal green line
    this.draw_horizontal_line(this.ctx, c_width / 2.0 - p_width / 2.0, c_width / 2.0 - p_width / 2.0 + x_shift, y_offset, this.card_width + "\'\'");

    //ctx.restore();
    console.log(c_width / 2.0 - p_width / 2.0 + x_shift)

  }

  draw_horizontal_line(ctx: any, x1: any, x2: any, y: any, txt: any): void {
    ctx.save();
    ctx.beginPath();

    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    ctx.lineWidth = 0.8;
    ctx.moveTo(x1, y - 7);
    ctx.lineTo(x2, y - 7);
    ctx.stroke();

    ctx.moveTo(x1, y - 2);
    ctx.lineTo(x1, y - 12);
    ctx.stroke();

    ctx.moveTo(x2, y - 2);
    ctx.lineTo(x2, y - 12);
    ctx.stroke();

    ctx.closePath();

    ctx.fillText(txt, x1 + (x2 - x1) / 2 - 5, y - 7 - 2);

    ctx.restore();
  }

  draw_vertical_line(ctx: any, x: any, y1: any, y2: any, txt: any): void {
    ctx.save();
    ctx.beginPath();

    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    ctx.lineWidth = 0.8;
    ctx.moveTo(x - 7, y1);
    ctx.lineTo(x - 7, y2);
    ctx.stroke();

    ctx.moveTo(x - 12, y1);
    ctx.lineTo(x - 2, y1);
    ctx.stroke();

    ctx.moveTo(x - 12, y2);
    ctx.lineTo(x - 2, y2);
    ctx.stroke();
    ctx.closePath();

    ctx.fillText(txt, x - 7 - 22, y1 + (y2 - y1) / 2);

    ctx.restore();

  }

  set_cookies_from_specs_obj(): void {
    for (let key of this.specs_obj.keys()) {
      this.cookieService.set(key + '', this.specs_obj.get(key)[0] + "");
    }
  }

  set_cookies_from_film_specs_obj(): void {
    this.cookieService.set('film_type', this.film_specs_obj.get('film_type') + "");

    this.cookieService.set('film_quantity', this.film_specs_obj.get('film_quantity') + "");
    this.cookieService.set('film_length', this.film_specs_obj.get('film_length') + "");
    this.cookieService.set('film_width', this.film_specs_obj.get('film_width') + "");

    this.cookieService.set('film_matt_rate', this.film_type_rates.get('matt')[0] + "");
    this.cookieService.set('film_gloss_rate', this.film_type_rates.get('gloss')[0] + "");
    this.cookieService.set('film_special_rate', this.film_type_rates.get('special')[0] + "");

  }



  set_specs_obj_from_cookies(): void {
    for (let key of this.specs_obj.keys()) {
      if (this.cookieService.check(key + '')) {
        if (this.cookieService.get(key + '').length > 0) {
          this.specs_obj.get(key + '')[0] = this.cookieService.get(key + '');
        }
      }
    }
    for (let key of this.specs_obj.keys()) {
      //console.log(key, this.specs_obj.get(key));
    }
  }

  set_film_specs_obj_from_cookies(): void {
    if (this.cookieService.check('film_type')) {
      this.film_specs_obj.get('film_type')[0] = this.cookieService.get('film_type');
    }
    if (this.cookieService.check('film_quantity')) {
      if (this.cookieService.get('film_quantity').length > 0) {
        this.film_specs_obj.get('film_quantity')[0] = this.cookieService.get('film_quantity');
      }
    }
    if (this.cookieService.check('film_length')) {
      if (this.cookieService.get('film_length').length > 0) {
        this.film_specs_obj.get('film_length')[0] = this.cookieService.get('film_length');
      }
    }
    if (this.cookieService.check('film_width')) {
      if (this.cookieService.get('film_width').length > 0) {
        this.film_specs_obj.get('film_width')[0] = this.cookieService.get('film_width');
      }
    }

    if (this.cookieService.check('film_matt_rate')) {
      if (this.cookieService.get('film_matt_rate').length > 0) {
        this.film_type_rates.get('matt')[0] = this.cookieService.get('film_matt_rate');
      }
    }
    if (this.cookieService.check('film_gloss_rate')) {
      if (this.cookieService.get('film_gloss_rate').length > 0) {
        this.film_type_rates.get('gloss')[0] = this.cookieService.get('film_gloss_rate');
      }
    }
    if (this.cookieService.check('film_special_rate')) {
      if (this.cookieService.get('film_special_rate').length > 0) {
        this.film_type_rates.get('special')[0] = this.cookieService.get('film_special_rate');
      }
    }


  }

  /* guillotine cut functions */
  guillotine_cut(L: number, W: number, x: number, y: number): any {
    var nop: number;
    var key: string = L.toFixed(4) + "," + W.toFixed(4) + "," + x.toFixed(4) + "," + y.toFixed(4);
    if (this.cut_memo.has(key)) {
      return this.cut_memo.get(key)[0];
    }

    var L1: number;
    var W1: number;
    var L2: number;
    var W2: number;

    var ind_max: number;
    var nop_max: number = Number.NEGATIVE_INFINITY;

    for (var it = 1; it <= 4; it++) {
      var cut_data = this.cl_cut(L, W, x, y, it);
      L1 = cut_data.L1;
      W1 = cut_data.W1;
      L2 = cut_data.L2;
      W2 = cut_data.W2;

      if (L1 < 0 || W1 < 0 || L2 < 0 || W2 < 0) {
        nop = 0;

        if (nop > nop_max) {
          nop_max = nop;
          ind_max = it;
        }

        continue;
      }
      var nop_a = this.guillotine_cut(L1, W1, x, y);
      var nop_b = this.guillotine_cut(L2, W2, x, y);

      nop = 1 + nop_a + nop_b;

      if (nop > nop_max) {
        nop_max = nop;
        ind_max = it;
      }

    }
    this.cut_memo.set(key, [nop_max, ind_max]);
    return nop_max;

  }

  cl_cut(L: number, W: number, x: number, y: number, opt: number): any {
    var L1: number;
    var W1: number;
    var L2: number;
    var W2: number;

    if (opt == 1) {
      /* X cut, x-orientation */
      L1 = L - y;
      W1 = this.cond_set(W, x);
      L2 = L;
      W2 = W - x;

    } else if (opt == 2) {
      /* X cut, y-orientation */
      L1 = L - x;
      W1 = this.cond_set(W, y);
      L2 = L;
      W2 = W - y;

    } else if (opt == 3) {
      /* Y cut, x-orientation */
      L1 = this.cond_set(L, y);
      W1 = W - x;
      L2 = L - y;
      W2 = W;

    } else if (opt == 4) {
      /* Y cut, y-orientation */
      L1 = this.cond_set(L, x);
      W1 = W - y;
      L2 = L - x;
      W2 = W;

    }
    return { L1: L1, W1: W1, L2: L2, W2: W2 };
  }

  cond_set(a: number, b: number): number {
    var out: number;
    if ((b - a) < 1e-08) {
      out = b;
    }
    else {
      out = -1;
    }
    return out;
  }

}


