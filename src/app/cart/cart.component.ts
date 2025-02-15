import {AfterViewInit, Component, OnInit} from '@angular/core';
import {NavComponent} from '../nav/nav.component';
import {AuthService} from '../services/auth/auth.service';
import {CartService} from '../services/cart/cart.service';
import {OrderService} from '../services/order/order.service';
import {FooterComponent} from '../utils/footer/footer.component';
import {Notification} from '../utils/notifications/notification/notification';
import {BehaviorSubject, Observable, switchMap, tap} from 'rxjs';

@Component({
  selector: 'app-cart',
  imports: [
    NavComponent,
    FooterComponent
  ],
  standalone: true,
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit {

  public products = new BehaviorSubject(new Array<any>());
  public totalPrice: Number = 0;
  private cart: any;
  private userId = new BehaviorSubject(0)

  constructor(private cartService: CartService, private authService: AuthService, private orderService: OrderService) {

  }

  ngOnInit() {
    this.userIdInitializer()
    this.displayProducts()
  }

  public removeFromCart(productId: number) {
    this.cartService.verifyExistenceOfProduct(this.userId.getValue(), Number.parseInt(productId.toString()))
      .pipe(
        switchMap((status: any) => status.result ?
          this.cartService.removeFromCart({userId: this.userId.getValue(), productId: productId})
          : new Observable())
      ).subscribe({
      next: (value: any) => {
        this.products.next(value.result.products)
        this.cartService.setCartLength(value.result.products.length)
        Notification.notifyValid("Product removed successfully")
      },
      error: (err) => {
        Notification.notifyInvalid("Product has not been removed.")
      }
    })
  }

  public displayProducts() {
    setTimeout(() => {
      this.cartService.getUserCart(this.userId.getValue())
        .pipe(
          tap((cart: any) => console.log(cart)),
          tap((cart: any) => this.products.next(cart.result.products)),
          switchMap(() => this.products)
        ).subscribe({
        next: (value: any) => {
          this.totalPrice = 0
          value.forEach((product: any) => {
            this.totalPrice += product.price;
          })
        },
        error: (err) => {
          console.log(err)
        }
      })
    }, 200)
  }

  public deleteAllProductFromCart() {
    this.authService.getCurrentLoggedUser()
      .pipe(
        switchMap(userId => this.cartService.getUserCart(userId)),
        switchMap((cart: any) => {
          this.products.next(new Array<any>())
          return this.cartService.removeAllProducts(cart.result.user.id)
        }),
      ).subscribe({
      next: () => {
        this.cartService.setCartLength(0)
      }
    })
  }

  public placeOrder() {

    console.log(this.cart)

    const body = {
      status: "CONFIRMED",
      totalPrice: this.totalPrice,
      user: {
        id: this.userId.getValue()
      },
      products: this.products.getValue()
    }

    this.orderService.createOrder(body).subscribe({
      next: () => {
        this.deleteAllProductFromCart()
        Notification.notifyValid("Order placed!")
      }, error: () => {
        Notification.notifyInvalid("Order not placed")
      }
    })
  }

  private userIdInitializer(): void {
    this.authService.getCurrentLoggedUser()
      .subscribe({
        next: (id) => {
          this.userId.next(id)
        },
      })
  }
}
