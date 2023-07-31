//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2023  Interneuron Holdings Ltd

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { Detail, FormularyIngredient, Product } from 'src/app/models/productdetail';
import { product, products } from 'src/app/models/productsearch';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { FormContext } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';


@Component({
  selector: 'app-search-medication',
  templateUrl: './search-medication.component.html',
  styleUrls: ['./search-medication.component.css']
})
export class SearchMedicationComponent implements OnInit, OnDestroy {
  results: products;
  @ViewChild('searchtext')
  private searchtexbox: ElementRef;
  @ViewChild('formulary')
  private formulary: ElementRef;
  @ViewChild('nonformulary')
  private nonformulary: ElementRef;

  @ViewChild('search')
  private search: ElementRef;
  @ViewChild('universalform')
  private universalform: ElementRef;

  @Input() formContext: FormContext;

  showloadingmessage = false;
  showsearchbar = true;
  subscriptions = new Subscription();
  searchrequestSubscriptions = new Subscription();
  delaySearch;
  u_error = "";
  u_form = "";
  u_name = "";
  u_sn;
  u_sd;
  u_snu;
  u_sdu;
  uomresults = [];
  formresults = []
  uoms = [];
  forms = [];
  searchtype = "";
  shownoresultsmessage = false;
  expanded = [];





  @Output() medicationselected = new EventEmitter<any>();
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService) {
  }

  ngOnInit(): void {
    this.GetFormsAndUoms();
  }

  getSearchText() {
    return ((this.searchtexbox.nativeElement as HTMLInputElement).value as string).trim();
  }

  clearSearchText() {
    if (this.searchtexbox)
      (this.searchtexbox.nativeElement as HTMLInputElement).value = "";

    this.u_form = "";
    this.u_name = "";
    this.u_sd = "";
    this.u_sn = "";
    this.u_snu = "";
    this.u_sdu = "";
    this.u_error = "";

  }

  CreatePostData(shownf: boolean) {

    var p = new SearchPostData();
    p.searchTerm = this.getSearchText();
    if (p.searchTerm == "" || p.searchTerm.length < 3)
      return null;
    p.formularyStatusCd = [];
    // if (this.formulary && this.formulary.nativeElement.checked) {
    //   p.formularyStatusCd.push("001");
    // }
    // if (this.nonformulary && this.nonformulary.nativeElement.checked) {
    //   p.formularyStatusCd.push("002");
    // }
    if (shownf) {
      this.searchtype = "non-formulary results"
      p.formularyStatusCd.push("002");
    }
    else {
      this.searchtype = "formulary results"
      p.formularyStatusCd.push("001");
    }
    const postdata = JSON.stringify(p);

    return postdata;
  }
  searchProducts(shownf: boolean) {
    const postdata = this.CreatePostData(shownf);//JSON.stringify({ "searchTerm": this.getSearchText() });
    this.appService.logToConsole(postdata);
    if (postdata) {
      this.searchrequestSubscriptions.unsubscribe();
      this.searchrequestSubscriptions = new Subscription();
      this.results = null;
      this.showloadingmessage = true;
      this.shownoresultsmessage = false;

      this.searchrequestSubscriptions.add(this.apiRequest.postRequest(this.appService.appConfig.uris.terminologybaseuri + "/Formulary/searchformularies?api-version=1.0", postdata)
        .subscribe((response) => {
          this.showloadingmessage = false;
          if (this.getSearchText().length >= 3) {
            if (response && response.data && response.data.length != 0) {
              this.results = new products();
              //this.results.deserialise(response);
              this.results = response;
              this.appService.logToConsole(this.results);
            }
            else {
              this.appService.logToConsole("nothing");
              this.shownoresultsmessage = true;
              // setTimeout(() => {
              //   this.shownoresultsmessage = false;
              // }, 3000);
            }
          }
        }));

      // this.apiRequest.getRequest("/assets/test.json")
      //   .subscribe((response) => {
      //     this.showloadingmessage = false;
      //     if (response && response.length != 0) {
      //       this.results = new products();
      //       this.results.deserialise(response);
      //       this.appService.logToConsole(this.results);
      //     }
      //     else {

      //     }
      //   });
    }
  }

  public Searchtextchange(shownf: boolean) {
    this.expanded = [];
    this.results = null;
    this.shownoresultsmessage = false;
    const searchtextlength = this.getSearchText().length;
    if (searchtextlength >= 3) {

      clearTimeout(this.delaySearch);
      this.delaySearch = setTimeout(e => {
        this.searchProducts(shownf);
      }, 1000);
    }
  }

  clearResultsAndSearchText() {
    this.expanded = [];
    this.results = null;
    this.clearSearchText();
  }

  public selectmedication(e) {
    if (e.productType == "VTM" && (this.formContext == FormContext.op || this.formContext == FormContext.mod)) {
      return;
    }
    else
      if ((e as product).prescribable) {
        this.getMedication((e as product).code, e);
        this.expanded = [];
      }
  }

  public getMedication(formularyid: string, e: Product) {
    var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformularydetailruleboundbycode"
    // if (e.productType.toLowerCase() == "vtm" || e.productType.toLowerCase() == "amp")
    //   endpoint = "https://terminologyapi-demo-current.azurewebsites.net/api/Formulary/getformularydetailrulebound";
    this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}/${formularyid}?api-version=1.0`)
      .subscribe((response) => {
        if (response && response.length != 0) {
          this.medicationselected.emit(response);
          this.clearResultsAndSearchText();
        }
        else { }
      }));


    // this.apiRequest.getRequest("/assets/test1.json")
    // .subscribe((response) => {
    //   this.showloadingmessage = false;
    //   if (response && response.length != 0) {
    //     this.medicationselected.emit(response);
    //     this.clearResultsAndSearchText();
    //   }});


  }

  ngOnDestroy(): void {
    this.clearResultsAndSearchText();
    this.subscriptions.unsubscribe();
    this.searchrequestSubscriptions.unsubscribe();

  }

  ShowUniversalForm() {
    this.clearResultsAndSearchText();
    this.showsearchbar = false;
  }

  CancelUniversalForm() {
    this.clearResultsAndSearchText();
    this.showsearchbar = true;
  }

  SaveUniversalForm() {
    this.u_error = "";

    if (this.ValidateUniversalForm()) {
      var p = this.GenerateCustomProduct();
      this.medicationselected.emit(p);
      this.clearResultsAndSearchText();
      this.showsearchbar = true;
    }
  }

  ValidateUniversalForm() {
    var formstate = true;

    this.u_sn = this.u_sn.toString().trim();
    this.u_sd = this.u_sd.toString().trim();
    if (!this.u_name) {
      this.u_error = "Please enter medication name";
      return false;
    }
    let maxlen = this.appService.appConfig.AppSettings.customMedicationNameMaxLength;

    if (isNaN(maxlen) || +maxlen <= 0) {
      maxlen = 256;
    }

    if (this.u_name.length > maxlen) {
      this.u_error = "Please enter less than " + maxlen + " characters in medication name";
      return false;
    }

    if (!this.u_form) {
      this.u_error = "Please select a medication form";
      return false;
    }
    if (this.u_sn && !this.u_snu) {
      this.u_error = "Please select strength value numerator units";
      return false;
    }
    if (this.u_sd && !this.u_sdu) {
      this.u_error = "Please select strength value denominator units";
      return false;
    }

    var x = this.forms.filter(x => x.desc == this.u_form);
    if (this.forms.filter(x => x == this.u_form).length == 0) {
      this.u_error = "Please select a valid medication form";
      return false;
    }

    if (this.u_sn && this.uoms.filter(x => x == this.u_snu).length == 0) {
      this.u_error = "Please select valid strength value numerator units";
      return false;
    }

    if (this.u_sd && this.uoms.filter(x => x == this.u_sdu).length == 0) {
      this.u_error = "Please select valid strength value denominator units";
      return false;
    }

    if (this.u_sdu && (!this.u_snu || !this.u_sn || !this.u_sd)) {
      this.u_error = "Please enter values for all of these: strength value numerator and units, strength value denominator";
      return false;
    }
    return true;
  }

  GenerateCustomProduct(): Product {
    var p = new Product;
    p.detail = new Detail();
    p.detail.prescribable = true;
    p.productType = "custom";
    p.formularyIngredients = [];
    p.code = this.u_name;
    p.detail.formularyVersionId = "custom";
    p.name = this.u_name;
    p.detail.formDesc = this.u_form;
    p.detail.roundingFactorDesc = 1;
    p.detail.atcCode = "";
    p.detail.unitDoseUnitOfMeasureDesc = "";

    if (this.u_snu || this.u_sdu)
      p.detail.doseFormCd = "1";
    else
      p.detail.doseFormCd = "3";

    //push ingredient
    var f = new FormularyIngredient();
    f.strengthValueNumerator = this.u_sn;
    f.strengthValueDenominator = this.u_sd;
    f.strengthValueNumeratorUnitDesc = this.u_snu;
    f.strengthValueDenominatorUnitDesc = this.u_sdu;
    f.formularyVersionId = "custom";
    f.ingredientName = this.u_name;
    f.ingredientCd = this.u_name;
    p.formularyIngredients.push(f);

    p.detail.unitDoseFormUnitsDesc = this.u_snu;

    return p;
  }

  GetFormsAndUoms() {
    var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Terminology/getdmdformlookup"
    this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}`)
      .subscribe((response) => {
        if (response && response.length != 0) {
          this.forms = response.map(x => x.desc);
        }
        else { this.appService.logToConsole("no forms") }
      }));

    var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Terminology/getdmduomlookup"
    this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}`)
      .subscribe((response) => {
        if (response && response.length != 0) {
          this.uoms = (response).map(x => x.desc).filter(y => y.indexOf("/") == -1);

        }
        else { this.appService.logToConsole("no uoms") }
      }));
  }

  expandtoggle(code) {
    let index = this.expanded.indexOf(code);
    if (index != -1) {
      this.expanded.splice(index, 1);
    }
    else
      this.expanded.push(code);
  }

  HasPrescribableChildren(e: product) {
    if (e.children)
      return e.children.filter(f => f.prescribable && (f.recStatusCode == "003" || f.recStatusCode == null)).length > 0;
    else
      return false;
  }

}

export class SearchPostData {
  searchTerm: string;
  showOnlyArchived: boolean;
  recStatusCds: string[];
  formularyStatusCd: string[];
  showOnlyDuplicate: boolean;
  includeDeleted: boolean;
  flags: string[];
}
