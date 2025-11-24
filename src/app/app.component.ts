import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  public title = 'RunMeter';

  constructor(
    private fb: FormBuilder,
    public router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.http
      .get<{ msg: string }>('http://192.168.1.76:3000/')
      .subscribe((res: { msg: string }) => {
        alert(res.msg);
      });
  }
}
