//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

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
import { Directive, ElementRef, Input, EventEmitter, Output } from '@angular/core';
import { SubjectsService } from '../services/subjects.service';

@Directive({
  selector: '[appWarningsLoader]'
})

export class WarningsLoaderDirective {

  @Output() moduleUnLoad?: EventEmitter<any> = new EventEmitter<any>();
  @Output() moduleLoadComplete?: EventEmitter<any> = new EventEmitter<any>();

  constructor(private elRef: ElementRef, private subjects: SubjectsService) {
  }

  @Input('appWarningsLoader')
  set moduleDataSubject(moduleData: ComponentModuleData) {

    //console.log('Received Module Data');
    //console.log(moduleData);

    if (moduleData) {
      this.elRef.nativeElement.innerHtml = '';
      this.loadComponent(moduleData);
    }
  }

  private loadComponent(moduleData: ComponentModuleData) {

    //console.log(this.elRef);

    const scriptEle: HTMLScriptElement = document.getElementById(`warning:WCScript_${moduleData.elementTag}`) as HTMLScriptElement;

    if (!scriptEle) {

      //console.log('Creating Script element');

      this.createScriptElement(moduleData,
        (e) => this.createCustomElement(moduleData)
      );
    } else {
      //console.log('Script element alredy exists. Creating element.');
      this.createCustomElement(moduleData);
    }
  }

  private createScriptElement = (moduleData: ComponentModuleData, onloadComplete: any) => {

    //console.log('Script loading...' + moduleData.url);

    const scriptEle = document.createElement('script');

    scriptEle.id = `warning:WCScript_${moduleData.elementTag}`;

    scriptEle.src = moduleData.url + "?V" + Math.random();

    scriptEle.async = true;

    scriptEle.onload = (e) => {

      console.log('Script load complete');
      // this.subjects.showMessage.next({ result: "complete", message: " ", timeout: 10 });

      if (onloadComplete) {
        onloadComplete(e);
      }
    };
    scriptEle.onerror = (e) => {
      // this.subjects.showMessage.next({ result: "failed", message: "<h5>Error loading Sepsis Assessment </h5>", timeout: 15000 });
      scriptEle.parentNode.removeChild(scriptEle);

      console.log(e);
    };
    document.body.appendChild(scriptEle);
  }

  private createCustomElement(moduleData: ComponentModuleData) {

    //console.log('inside createCustomElement');

    const customEle: HTMLElement = document.createElement(moduleData.elementTag);

    customEle['moduleContext'] = moduleData.moduleContext;

    let el = this.elRef; //Local reference - closure wont work

    customEle['unload'] = (data: any) => {
      if (data && data.name === 'warnings') {
        this.sepisComponentUnloadHandler(data, el);
      }
    }


    customEle.addEventListener('onloadcomplete',(data)=>{ this.onloadCompletedHandler(data); })

    // customEle['onloadcomplete'] = (data: any) => {
    //   if (data) {
    //     this.onloadCompletedHandler(data);
    //   }
    // }

    this.elRef.nativeElement.appendChild(customEle);

    //console.log('this.contextChangedEventInvoker=' + customEle);
    //console.log(customEle);

    //console.log(customEle['currentPatientId']);
  }

  private sepisComponentUnloadHandler(data: any, el: ElementRef<any>) {
    this.elRef.nativeElement.innerHtml = '';
    if (this.moduleUnLoad) this.moduleUnLoad.emit();
  }

  private onloadCompletedHandler(data: any) {
    if (this.moduleLoadComplete) this.moduleLoadComplete.emit(data.detail);
  }

}

export class ComponentModuleData {
  url: string;
  elementTag: string;
  moduleContext: IContext;
  enableOverideAction : boolean;
  constructor()
  {
    this.moduleContext = new IContext();
  }
}

// This should go as a package
export class IContext {
  encouterId?: string
  personId?: string
  refreshonload: boolean
  apiService: any;
  existingwarnings: boolean;
  newwarnings: boolean;
  enableOverride: boolean;
  warningContext:string;
  viewOnly: boolean = false;
  filterDisplayByPresId: string;
  filterDisplayByMedCode:string; 
}
